const repository = require('../db/repository');
const { ApiError } = require('../http/errors');
const { requireString, requireInt } = require('./validation');

function list() {
  return repository.connections.list();
}

function create(payload = {}) {
  const companyId = requireInt(payload.companyId, 'companyId');
  const name = requireString(payload.name, 'name');
  const type = requireString(payload.type, 'type');
  const configuration = payload.configuration ?? {};

  if (!repository.companies.findById(companyId)) {
    throw new ApiError(400, 'Empresa informada não existe.');
  }

  return repository.connections.create({ companyId, name, type, configuration });
}

module.exports = { list, create };
