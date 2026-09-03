const repository = require('../db/repository');
const { ApiError } = require('../http/errors');
const { requireString, requireInt, optionalString } = require('./validation');

function list() {
  return repository.dashboards.list();
}

function create(payload = {}) {
  const companyId = requireInt(payload.companyId, 'companyId');
  const name = requireString(payload.name, 'name');
  const description = optionalString(payload.description);
  const isDefault = payload.isDefault ? 1 : 0;

  if (!repository.companies.findById(companyId)) {
    throw new ApiError(400, 'Empresa informada não existe.');
  }

  return repository.dashboards.create({ companyId, name, description, isDefault });
}

module.exports = { list, create };
