const repository = require('../db/repository');
const { ApiError } = require('../http/errors');
const { requireString, requireInt, optionalInt } = require('./validation');

function list() {
  return repository.widgets.list();
}

function create(payload = {}) {
  const dashboardId = requireInt(payload.dashboardId, 'dashboardId');
  const name = requireString(payload.name, 'name');
  const type = requireString(payload.type, 'type');
  const position = optionalInt(payload.position) ?? 0;
  const configuration = payload.configuration ?? null;

  if (!repository.dashboards.findById(dashboardId)) {
    throw new ApiError(400, 'Dashboard informado não existe.');
  }

  return repository.widgets.create({ dashboardId, name, type, position, configuration });
}

module.exports = { list, create };
