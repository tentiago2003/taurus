const repository = require('../db/repository');
const { ApiError } = require('../http/errors');
const { requireString, requireInt, optionalInt } = require('./validation');

const ADMIN_PROFILE_NAME = 'Admin';

function list() {
  return repository.users.list();
}

function create(payload = {}) {
  const name = requireString(payload.name, 'name');
  const email = requireString(payload.email, 'email');
  const passwordHash = requireString(payload.passwordHash, 'passwordHash');
  const profileId = requireInt(payload.profileId, 'profileId');
  const companyId = optionalInt(payload.companyId);

  const profile = repository.profiles.findById(profileId);
  if (!profile) {
    throw new ApiError(400, 'Perfil informado não existe.');
  }

  // Gerente e Consulta exigem empresa; Admin pode ter company_id nulo.
  if (profile.name !== ADMIN_PROFILE_NAME && companyId === null) {
    throw new ApiError(400, `Usuários com perfil "${profile.name}" exigem company_id.`);
  }

  if (companyId !== null && !repository.companies.findById(companyId)) {
    throw new ApiError(400, 'Empresa informada não existe.');
  }

  return repository.users.create({ companyId, profileId, name, email, passwordHash });
}

module.exports = { list, create };
