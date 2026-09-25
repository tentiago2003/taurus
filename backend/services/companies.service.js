const repository = require('../db/repository');
const { requireString, ApiError } = require('./validation');
const access = require('./access.service');

function list(user) {
  access.ensureAdmin(user);
  return repository.companies.list();
}

function create(payload = {}, user) {
  access.ensureAdmin(user);
  const name = requireString(payload.name, 'name');
  return repository.companies.create({ name, createdBy: payload.createdBy ?? null });
}

function ensureExists(id) {
  const company = repository.companies.findById(id);
  if (!company) {
    throw new ApiError(404, 'Empresa não encontrada.');
  }
  return company;
}

function update(id, payload = {}, user) {
  access.ensureAdmin(user);
  ensureExists(id);
  const name = requireString(payload.name, 'name');
  return repository.companies.update({ id, name, updatedBy: null });
}

function deactivate(id, user) {
  access.ensureAdmin(user);
  ensureExists(id);
  return repository.companies.setActive({ id, active: 0, updatedBy: null });
}

function reactivate(id, user) {
  access.ensureAdmin(user);
  ensureExists(id);
  return repository.companies.setActive({ id, active: 1, updatedBy: null });
}

function remove(id, user) {
  access.ensureAdmin(user);
  ensureExists(id);
  const dependents = repository.companies.countDependents(id);
  const total = dependents.users + dependents.connections + dependents.dashboards;
  if (total > 0) {
    throw new ApiError(
      409,
      'Empresa possui registros vinculados (usuários, conexões ou dashboards) e não pode ser excluída. Desative-a em vez de excluir.'
    );
  }
  repository.companies.remove(id);
}

module.exports = { list, create, update, deactivate, reactivate, remove };
