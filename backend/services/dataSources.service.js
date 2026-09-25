const repository = require('../db/repository');
const { ApiError } = require('../http/errors');
const { requireString, requireInt, optionalInt } = require('./validation');
const access = require('./access.service');

function list(user) {
  if (!user || access.isAdmin(user)) return repository.dataSources.list();
  return repository.dataSources.list().filter((source) => Number(access.companyIdFromConnection(source.connection_id)) === Number(user.company_id));
}

function create(payload = {}, user) {
  access.ensureAdminOrManager(user);
  const connectionId = requireInt(payload.connectionId, 'connectionId');
  const name = requireString(payload.name, 'name');
  const type = requireString(payload.type, 'type');
  const topic = payload.topic ?? null;
  const defaultSamplingIntervalSeconds = repository.systemSettings.get().default_sampling_interval_seconds;
  const samplingIntervalSeconds = optionalInt(payload.samplingIntervalSeconds) ?? defaultSamplingIntervalSeconds;
  const storeHistory = payload.storeHistory === undefined ? 1 : payload.storeHistory ? 1 : 0;
  const configuration = payload.configuration ?? null;

  const connection = repository.connections.findById(connectionId);
  if (!connection) throw new ApiError(400, 'Conexão informada não existe.');
  access.ensureCompanyAccess(user, connection.company_id);

  return repository.dataSources.create({
    connectionId,
    name,
    type,
    topic,
    samplingIntervalSeconds,
    storeHistory,
    configuration,
  });
}

module.exports = { list, create };
