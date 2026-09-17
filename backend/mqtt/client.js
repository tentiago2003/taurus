const mqtt = require('mqtt');
const { parseMqttPayload } = require('./parser');

function createMqttConnection(config) {
  let client;
  let onConnect;
  let onError;
  let onMessage;
  let onRawMessage;
  let onClose;
  let onReconnect;
  let onOffline;

  function connect() {
    client = mqtt.connect({
      host: config.host,
      port: Number(config.port),
      username: config.username,
      password: config.password,
      connectTimeout: config.connectTimeout,
      reconnectPeriod: config.reconnectPeriod === undefined ? 1000 : config.reconnectPeriod,
    });

    client.on('connect', () => {
      if (typeof onConnect === 'function') onConnect();
    });

    client.on('reconnect', () => {
      if (typeof onReconnect === 'function') onReconnect();
    });

    client.on('offline', () => {
      if (typeof onOffline === 'function') onOffline();
    });

    client.on('close', () => {
      if (typeof onClose === 'function') onClose();
    });

    client.on('message', (topic, payload) => {
      if (typeof onRawMessage === 'function') {
        onRawMessage(payload, topic, new Date().toISOString());
      }

      try {
        const parsedPayload = parseMqttPayload(payload.toString());
        console.log(`Parsed message from ${topic}:`, parsedPayload);
        if (parsedPayload && typeof onMessage === 'function') {
          onMessage(parsedPayload, topic);
        }
      } catch (error) {
        console.error(`Error parsing message from ${topic}: ${error.message}`);
      }
    });

    client.on('error', (error) => {
      if (typeof onError === 'function') onError(error);
    });
  }

  function subscribe(subscribeTopics) {
    return new Promise((resolve, reject) => {
      if (!client) {
        reject(new Error('MQTT client is not connected'));
        return;
      }
      client.subscribe(subscribeTopics, (error) => {
        if (error) return reject(error);
        resolve();
      });
    });
  }

  function disconnect() {
    if (client) {
      client.removeAllListeners();
      client.end(true);
      client = undefined;
    }
  }

  return {
    connect,
    subscribe,
    disconnect,
    onConnect(callback) { onConnect = callback; return this; },
    onError(callback) { onError = callback; return this; },
    onMessage(callback) { onMessage = callback; return this; },
    onRawMessage(callback) { onRawMessage = callback; return this; },
    onClose(callback) { onClose = callback; return this; },
    onReconnect(callback) { onReconnect = callback; return this; },
    onOffline(callback) { onOffline = callback; return this; },
  };
}

module.exports = { createMqttConnection };
