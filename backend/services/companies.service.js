const repository = require('../db/repository');
const { requireString, ApiError } = require('./validation');

function list() {
  return repository.companies.list();
}

function create(payload = {}) {
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

function update(id, payload = {}) {
  ensureExists(id);
  const name = requireString(payload.name, 'name');
  return repository.companies.update({ id, name, updatedBy: null });
}

function deactivate(id) {
  ensureExists(id);
  return repository.companies.setActive({ id, active: 0, updatedBy: null });
}

function reactivate(id) {
  ensureExists(id);
  return repository.companies.setActive({ id, active: 1, updatedBy: null });
}

function remove(id) {
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
