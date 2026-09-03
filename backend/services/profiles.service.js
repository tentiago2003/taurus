const repository = require('../db/repository');
const { requireString, optionalString } = require('./validation');

function list() {
  return repository.profiles.list();
}

/** Perfis criados via API nunca são perfis de sistema; os 3 padrões já existem via seed. */
function create(payload = {}) {
  const name = requireString(payload.name, 'name');
  const description = optionalString(payload.description);
  return repository.profiles.create({ name, description });
}

module.exports = { list, create };
