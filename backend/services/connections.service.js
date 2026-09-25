const repository = require('../db/repository');
const { ApiError } = require('../http/errors');
const { requireString, requireInt, optionalInt } = require('./validation');
const access = require('./access.service');

const SUPPORTED_TYPES = new Set(['MQTT']);

function sanitizeConfiguration(configuration = {}) {
  const { password, ...safe } = configuration || {};
  return { ...safe, hasPassword: Boolean(password) };
}

function sanitizeConnection(connection) {
  if (!connection) return connection;
  return {
    ...connection,
    configuration: sanitizeConfiguration(connection.configuration),
    dataSources: repository.dataSources.listByConnection(connection.id),
  };
}

function list(user) {
  if (!user || access.isAdmin(user)) return repository.connections.list().map(sanitizeConnection);
  return repository.connections.listByCompany(user.company_id).map(sanitizeConnection);
}

function normalizeConfiguration(payload = {}, existingConfiguration = {}) {
  return {
    host: requireString(payload.host, 'host'),
    port: requireInt(payload.port, 'port'),
    username: payload.username?.trim() || '',
    password: payload.password ? String(payload.password) : (existingConfiguration.password || ''),
  };
}

function normalizeTopics(topics) {
  if (!Array.isArray(topics) || topics.length === 0) {
    throw new ApiError(400, 'Informe pelo menos um tópico MQTT.');
  }

  const defaultSamplingIntervalSeconds = repository.systemSettings.get().default_sampling_interval_seconds;

  const normalized = topics.map((topic, index) => ({
    id: topic.id === undefined || topic.id === null || topic.id === '' ? null : requireInt(topic.id, `topics[${index}].id`),
    name: requireString(topic.name, `topics[${index}].name`),
    topic: requireString(topic.topic, `topics[${index}].topic`),
    samplingIntervalSeconds: optionalInt(topic.samplingIntervalSeconds) ?? defaultSamplingIntervalSeconds,
    storeHistory: topic.storeHistory === undefined ? 1 : topic.storeHistory ? 1 : 0,
    active: topic.active === undefined ? 1 : topic.active ? 1 : 0,
  }));

  const names = new Set();
  const topicPaths = new Set();
  for (const item of normalized) {
    if (names.has(item.name)) {
      throw new ApiError(400, `Nome de fonte duplicado: ${item.name}.`);
    }
    if (topicPaths.has(item.topic)) {
      throw new ApiError(400, `Tópico duplicado: ${item.topic}.`);
    }
    names.add(item.name);
    topicPaths.add(item.topic);
  }

  return normalized;
}

function validateType(type) {
  if (!SUPPORTED_TYPES.has(type)) {
    throw new ApiError(400, `Tipo de conexão não suportado: ${type}.`);
  }
}

function ensureCompany(companyId) {
  if (!repository.companies.findById(companyId)) {
    throw new ApiError(400, 'Empresa informada não existe.');
  }
}

function ensureExists(id) {
  const connection = repository.connections.findById(id);
  if (!connection) {
    throw new ApiError(404, 'Conexão não encontrada.');
  }
  return connection;
}

function get(id, user) {
  const connection = ensureExists(id);
  access.ensureCompanyAccess(user, connection.company_id);
  return sanitizeConnection(connection);
}

function create(payload = {}, user) {
  access.ensureAdminOrManager(user);
  const requestedCompanyId = optionalInt(payload.companyId);
  const companyId = access.resolveCompanyIdForWrite(user, requestedCompanyId);
  const name = requireString(payload.name, 'name');
  const type = requireString(payload.type, 'type');
  validateType(type);
  ensureCompany(companyId);
  const configuration = normalizeConfiguration(payload.configuration || payload);
  const topics = normalizeTopics(payload.topics);

  return sanitizeConnection(repository.connections.createWithDataSources({
    companyId,
    name,
    type,
    configuration,
    dataSources: topics,
    createdBy: payload.createdBy ?? null,
  }));
}

function update(id, payload = {}, user) {
  const existing = ensureExists(id);
  access.ensureAdminOrManager(user);
  access.ensureCompanyAccess(user, existing.company_id);
  const requestedCompanyId = optionalInt(payload.companyId);
  const companyId = requestedCompanyId ?? existing.company_id;
  if (Number(companyId) !== Number(existing.company_id)) {
    throw new ApiError(400, 'A empresa da conexão não pode ser alterada após sua criação.');
  }
  const name = requireString(payload.name, 'name');
  const type = requireString(payload.type, 'type');
  validateType(type);
  ensureCompany(companyId);
  const configuration = normalizeConfiguration(payload.configuration || payload, existing.configuration);
  const topics = normalizeTopics(payload.topics);

  return sanitizeConnection(repository.connections.updateWithDataSources({
    id,
    companyId,
    name,
    type,
    configuration,
    dataSources: topics,
    updatedBy: payload.updatedBy ?? null,
  }));
}

function setActive(id, active, user) {
  const existing = ensureExists(id);
  access.ensureAdminOrManager(user);
  access.ensureCompanyAccess(user, existing.company_id);
  return sanitizeConnection(repository.connections.setActive({ id, active, updatedBy: null }));
}

function deactivate(id, user) { return setActive(id, 0, user); }
function reactivate(id, user) { return setActive(id, 1, user); }

function remove(id, user) {
  const existing = ensureExists(id);
  access.ensureAdminOrManager(user);
  access.ensureCompanyAccess(user, existing.company_id);
  repository.connections.remove(id);
}

module.exports = {
  list,
  get,
  create,
  update,
  deactivate,
  reactivate,
  remove,
};
