const repository = require('../db/repository');
const { ApiError } = require('../http/errors');
const { requireString, requireEmail, requireInt, optionalInt } = require('./validation');
const { hashPassword } = require('./password');

const ADMIN_PROFILE_NAME = 'Admin';

/** Remove password_hash da resposta: nunca deve trafegar pela API. */
function sanitize(user) {
  if (!user) {
    return user;
  }
  const { password_hash, ...rest } = user;
  return rest;
}

function resolveProfile(profileId) {
  const profile = repository.profiles.findById(profileId);
  if (!profile) {
    throw new ApiError(400, 'Perfil informado não existe.');
  }
  return profile;
}

/** Admin pode ter company_id nulo; Gerente e Consulta exigem empresa. */
function ensureCompanyRule(profile, companyId) {
  if (profile.name !== ADMIN_PROFILE_NAME && companyId === null) {
    throw new ApiError(400, `Usuários com perfil "${profile.name}" exigem company_id.`);
  }
  if (companyId !== null && !repository.companies.findById(companyId)) {
    throw new ApiError(400, 'Empresa informada não existe.');
  }
}

function ensureEmailAvailable(email, excludeId = null) {
  const existing = repository.users.findByEmail(email);
  if (existing && existing.id !== excludeId) {
    throw new ApiError(409, 'Já existe um usuário com este e-mail.');
  }
}

function ensureExists(id) {
  const user = repository.users.findById(id);
  if (!user) {
    throw new ApiError(404, 'Usuário não encontrado.');
  }
  return user;
}

function list() {
  return repository.users.list().map(sanitize);
}

function findById(id) {
  return sanitize(ensureExists(id));
}

function create(payload = {}) {
  const name = requireString(payload.name, 'name');
  const email = requireEmail(payload.email);
  const password = requireString(payload.password, 'password');
  const profileId = requireInt(payload.profileId, 'profileId');
  const companyId = optionalInt(payload.companyId);

  const profile = resolveProfile(profileId);
  ensureCompanyRule(profile, companyId);
  ensureEmailAvailable(email);

  const created = repository.users.create({
    companyId,
    profileId,
    name,
    email,
    passwordHash: hashPassword(password),
    createdBy: payload.createdBy ?? null,
  });
  return sanitize(created);
}

function update(id, payload = {}) {
  ensureExists(id);
  const name = requireString(payload.name, 'name');
  const email = requireEmail(payload.email);
  const profileId = requireInt(payload.profileId, 'profileId');
  const companyId = optionalInt(payload.companyId);

  const profile = resolveProfile(profileId);
  ensureCompanyRule(profile, companyId);
  ensureEmailAvailable(email, id);

  // Senha só é alterada quando uma nova é informada.
  const passwordHash = payload.password ? hashPassword(requireString(payload.password, 'password')) : null;

  const updated = repository.users.update({
    id,
    companyId,
    profileId,
    name,
    email,
    passwordHash,
    updatedBy: null,
  });
  return sanitize(updated);
}

function deactivate(id) {
  ensureExists(id);
  return sanitize(repository.users.setActive({ id, active: 0, updatedBy: null }));
}

function reactivate(id) {
  ensureExists(id);
  return sanitize(repository.users.setActive({ id, active: 1, updatedBy: null }));
}

function remove(id) {
  ensureExists(id);
  repository.users.remove(id);
}

/**
 * Bootstrap do primeiro Admin via TAURUS_ADMIN_EMAIL/TAURUS_ADMIN_PASSWORD.
 * Idempotente: não recria nem sobrescreve senha se o e-mail já existir.
 * Não substitui um sistema de autenticação completo.
 */
function bootstrapAdmin() {
  const email = process.env.TAURUS_ADMIN_EMAIL;
  const password = process.env.TAURUS_ADMIN_PASSWORD;
  if (!email || !password) {
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (repository.users.findByEmail(normalizedEmail)) {
    return;
  }

  const adminProfile = repository.profiles.findByName(ADMIN_PROFILE_NAME);
  if (!adminProfile) {
    return;
  }

  repository.users.create({
    companyId: null,
    profileId: adminProfile.id,
    name: 'Admin',
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    createdBy: null,
  });
  console.log(`Usuário Admin inicial criado: ${normalizedEmail}`);
}

module.exports = {
  list,
  findById,
  create,
  update,
  deactivate,
  reactivate,
  remove,
  bootstrapAdmin,
};
