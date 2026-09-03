const repository = require('../db/repository');
const { ApiError } = require('../http/errors');
const { requireString, requireInt, optionalInt } = require('./validation');

function list() {
  return repository.dataSources.list();
}

function create(payload = {}) {
  const connectionId = requireInt(payload.connectionId, 'connectionId');
  const name = requireString(payload.name, 'name');
  const type = requireString(payload.type, 'type');
  const topic = payload.topic ?? null;
  const samplingIntervalSeconds = optionalInt(payload.samplingIntervalSeconds) ?? 600;
  const storeHistory = payload.storeHistory === undefined ? 1 : payload.storeHistory ? 1 : 0;
  const configuration = payload.configuration ?? null;

  if (!repository.connections.findById(connectionId)) {
    throw new ApiError(400, 'Conexão informada não existe.');
  }

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
