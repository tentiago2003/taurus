const repository = require('../db/repository');
const { requireString } = require('./validation');

function list() {
  return repository.companies.list();
}

function create(payload = {}) {
  const name = requireString(payload.name, 'name');
  return repository.companies.create({ name, createdBy: payload.createdBy ?? null });
}

module.exports = { list, create };
