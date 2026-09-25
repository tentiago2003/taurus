const repository = require('../db/repository');
const { requireString, optionalString } = require('./validation');
const access = require('./access.service');

function list(user) {
  if (!user || access.isAdmin(user)) return repository.profiles.list();
  if (access.isManager(user)) {
    return repository.profiles.list().filter((profile) => [access.PROFILE_MANAGER, access.PROFILE_VIEWER].includes(profile.name));
  }
  access.ensureAdmin(user);
}

/** Perfis criados via API nunca são perfis de sistema; os 3 padrões já existem via seed. */
function create(payload = {}, user) {
  access.ensureAdmin(user);
  const name = requireString(payload.name, 'name');
  const description = optionalString(payload.description);
  return repository.profiles.create({ name, description });
}

module.exports = { list, create };
