const repository = require('../db/repository');
const { createMqttConnection } = require('../mqtt/client');
const rawMessagesService = require('./rawMessages.service');
const samplingService = require('./sampling.service');

const RECONNECT_PERIOD_MS = 5000;
const runtime = new Map();
let broadcast = () => {};

function now() { return new Date().toISOString(); }

function emitStatus(connectionId, status, message = '') {
  const current = runtime.get(connectionId);
  const payload = {
    type: 'connection_status',
    connectionId,
    status,
    message,
    timestamp: now(),
    lastMessageAt: current?.lastMessageAt || null,
  };
  broadcast(payload);
}

function logEvent(connectionId, eventType, message, details = null) {
  try {
    repository.connectionEvents.create({ connectionId, eventType, message, details });
  } catch (error) {
    console.error(`Erro ao registrar evento da conexão ${connectionId}:`, error.message);
  }
}

function setRuntimeStatus(connectionId, status, message = '') {
  const current = runtime.get(connectionId);
  if (current) current.status = status;
  emitStatus(connectionId, status, message);
}

function buildConfig(connection) {
  const configuration = connection.configuration || {};
  return {
    host: configuration.host,
    port: configuration.port,
    username: configuration.username || '',
    password: configuration.password || '',
    connectTimeout: 10000,
    reconnectPeriod: RECONNECT_PERIOD_MS,
  };
}

function start(connectionId) {
  const connectionRecord = repository.connections.findById(connectionId);
  if (!connectionRecord) throw new Error('Conexão não encontrada.');
  if (!connectionRecord.active) return getStatus(connectionId);

  const existing = runtime.get(connectionId);
  if (existing && (existing.status === 'connecting' || existing.status === 'connected' || existing.status === 'reconnecting')) {
    return getStatus(connectionId);
  }
  if (existing) stop(connectionId, { log: false });

  const entry = { status: 'connecting', connection: null, lastMessageAt: null, subscribedTopics: [] };
  runtime.set(connectionId, entry);
  logEvent(connectionId, 'CONNECTING', 'Iniciando conexão MQTT.');
  emitStatus(connectionId, 'connecting', 'Conectando ao broker MQTT...');

  const mqttConnection = createMqttConnection(buildConfig(connectionRecord));
  entry.connection = mqttConnection;

  mqttConnection
    .onConnect(async () => {
      if (runtime.get(connectionId)?.connection !== mqttConnection) return;
      setRuntimeStatus(connectionId, 'connecting', 'Conectado ao broker. Assinando tópicos...');
      const sources = repository.dataSources
        .listByConnection(connectionId)
        .filter((source) => source.active && source.topic);
      const topics = sources.map((source) => source.topic);
      try {
        if (topics.length > 0) await mqttConnection.subscribe(topics);
        entry.subscribedTopics = topics;
        entry.status = 'connected';
        logEvent(connectionId, 'CONNECTED', topics.length ? `Conexão estabelecida e ${topics.length} tópico(s) assinado(s).` : 'Conexão estabelecida sem tópicos ativos.', { topics });
        emitStatus(connectionId, 'connected', 'Conexão estabelecida.');
      } catch (error) {
        entry.status = 'error';
        logEvent(connectionId, 'CONNECTION_ERROR', `Erro ao assinar tópicos: ${error.message}`, { error: error.message });
        emitStatus(connectionId, 'error', `Erro ao assinar tópicos: ${error.message}`);
      }
    })
    .onReconnect(() => {
      if (runtime.get(connectionId)?.connection !== mqttConnection) return;
      setRuntimeStatus(connectionId, 'reconnecting', 'Tentando restabelecer a conexão...');
      logEvent(connectionId, 'RECONNECTING', 'Tentando restabelecer a conexão MQTT.', { reconnectPeriodMs: RECONNECT_PERIOD_MS });
    })
    .onOffline(() => {
      if (runtime.get(connectionId)?.connection !== mqttConnection) return;
      logEvent(connectionId, 'OFFLINE', 'Cliente MQTT ficou offline; aguardando reconexão.', { reconnectPeriodMs: RECONNECT_PERIOD_MS });
    })
    .onClose(() => {
      if (runtime.get(connectionId)?.connection !== mqttConnection) return;
      entry.status = 'disconnected';
      logEvent(connectionId, 'DISCONNECTED', 'Conexão MQTT perdida. O cliente tentará reconectar automaticamente.');
      emitStatus(connectionId, 'disconnected', 'Conexão perdida. Aguardando reconexão...');
    })
    .onRawMessage((payload, topic, receivedAt) => {
      if (runtime.get(connectionId)?.connection !== mqttConnection) return;
      try {
        const rawMessage = rawMessagesService.collect({ connectionId, topic, payload, receivedAt });
        if (rawMessage) {
          const dataSource = repository.dataSources.findByConnectionAndTopic(connectionId, topic);
          if (dataSource) {
            const samplingResult = samplingService.process({
              dataSourceId: dataSource.id,
              payload,
              receivedAt,
            });
            if (samplingResult.errors.length > 0) {
              logEvent(connectionId, 'INTERPRETATION_WARNING', 'Mensagem recebida com falhas de interpretação.', {
                topic,
                dataSourceId: dataSource.id,
                errors: samplingResult.errors,
              });
            }
          }
        }
      } catch (error) {
        logEvent(connectionId, 'RAW_MESSAGE_ERROR', `Erro ao armazenar mensagem bruta: ${error.message}`, {
          topic,
          error: error.message,
        });
      }
    })
    .onError((error) => {
      if (runtime.get(connectionId)?.connection !== mqttConnection) return;
      logEvent(connectionId, 'CONNECTION_ERROR', error.message, { error: error.message });
      if (entry.status !== 'connected') {
        entry.status = 'error';
        emitStatus(connectionId, 'error', error.message);
      }
    })
    .onMessage((data, topic) => {
      if (runtime.get(connectionId)?.connection !== mqttConnection) return;
      entry.lastMessageAt = now();
      if (entry.status !== 'connected') entry.status = 'connected';
      broadcast({
        type: 'connection_message',
        connectionId,
        topic,
        data,
        receivedAt: entry.lastMessageAt,
      });
      emitStatus(connectionId, 'connected', 'Dados recebidos.');
    });

  try { mqttConnection.connect(); }
  catch (error) {
    entry.status = 'error';
    logEvent(connectionId, 'CONNECTION_ERROR', error.message, { error: error.message });
    emitStatus(connectionId, 'error', error.message);
  }
  return getStatus(connectionId);
}

function stop(connectionId, { log = true } = {}) {
  const entry = runtime.get(connectionId);
  if (!entry) {
    emitStatus(connectionId, 'inactive', 'Conexão não está em execução.');
    return { connectionId, status: 'inactive' };
  }
  runtime.delete(connectionId);
  entry.connection.disconnect();
  for (const dataSource of repository.dataSources.listByConnection(connectionId)) {
    samplingService.flushDataSource(dataSource.id);
  }
  if (log) logEvent(connectionId, 'DISCONNECTED', 'Conexão encerrada pelo Taurus.');
  emitStatus(connectionId, 'inactive', 'Conexão desativada.');
  return { connectionId, status: 'inactive' };
}

function reconnect(connectionId) {
  const record = repository.connections.findById(connectionId);
  if (!record) throw new Error('Conexão não encontrada.');
  if (!record.active) return { ...getStatus(connectionId), message: 'Ative a conexão antes de reconectar.' };
  stop(connectionId, { log: false });
  return start(connectionId);
}

function sync(connectionId) {
  const record = repository.connections.findById(connectionId);
  if (!record || !record.active) return stop(connectionId, { log: false });
  return reconnect(connectionId);
}

function getStatus(connectionId) {
  const record = repository.connections.findById(connectionId);
  const entry = runtime.get(connectionId);
  if (!record?.active) return { connectionId, configuredActive: false, status: 'inactive', lastMessageAt: null };
  return {
    connectionId,
    configuredActive: true,
    status: entry?.status || 'disconnected',
    lastMessageAt: entry?.lastMessageAt || null,
    subscribedTopics: entry?.subscribedTopics || [],
  };
}

function startActiveConnections() {
  const activeConnections = repository.connections.listActive();
  for (const connection of activeConnections) {
    try { start(connection.id); }
    catch (error) { console.error(`Erro ao iniciar conexão ${connection.id}:`, error.message); }
  }
  return activeConnections.length;
}

function stopAll({ log = false, eventType = 'BACKEND_SHUTDOWN', message = 'Backend encerrado; conexão MQTT interrompida pelo Taurus.' } = {}) {
  for (const connectionId of Array.from(runtime.keys())) {
    if (log) logEvent(connectionId, eventType, message);
    stop(connectionId, { log: false });
  }
  samplingService.flushAll();
}

function listStatuses() {
  const result = {};
  for (const connection of repository.connections.list()) result[connection.id] = getStatus(connection.id);
  return result;
}

function init(options = {}) { broadcast = typeof options.broadcast === 'function' ? options.broadcast : () => {}; }

module.exports = { init, start, stop, reconnect, sync, startActiveConnections, stopAll, getStatus, listStatuses };
