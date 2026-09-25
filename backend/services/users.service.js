const repository = require('../db/repository');
const { ApiError } = require('../http/errors');
const { requireString, requireEmail, requireInt, optionalInt } = require('./validation');
const { hashPassword } = require('./password');
const access = require('./access.service');

const ADMIN_PROFILE_NAME = access.PROFILE_ADMIN;

function sanitize(user) {
  if (!user) return user;
  const { password_hash, ...rest } = user;
  const profile = repository.profiles.findById(user.profile_id);
  return { ...rest, profile_name: profile?.name ?? null };
}

function resolveProfile(profileId) {
  const profile = repository.profiles.findById(profileId);
  if (!profile) throw new ApiError(400, 'Perfil informado não existe.');
  return profile;
}

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
  if (existing && existing.id !== excludeId) throw new ApiError(409, 'Já existe um usuário com este e-mail.');
}

function ensureExists(id) {
  const user = repository.users.findById(id);
  if (!user) throw new ApiError(404, 'Usuário não encontrado.');
  return user;
}

function list(actor) {
  if (!actor || access.isAdmin(actor)) return repository.users.list().map(sanitize);
  if (!access.isManager(actor)) throw new ApiError(403, 'Usuário sem permissão para consultar usuários.');
  return repository.users.list().filter((user) => Number(user.company_id) === Number(actor.company_id)).map(sanitize);
}

function findById(id, actor) {
  const user = ensureExists(id);
  access.ensureUserManagementTarget(actor, user);
  return sanitize(user);
}

function create(payload = {}, actor) {
  access.ensureAdminOrManager(actor);
  const name = requireString(payload.name, 'name');
  const email = requireEmail(payload.email);
  const password = requireString(payload.password, 'password');
  const profileId = requireInt(payload.profileId, 'profileId');
  const profile = resolveProfile(profileId);
  access.ensureUserProfileForManager(actor, profile);

  const requestedCompanyId = optionalInt(payload.companyId);
  const companyId = access.resolveCompanyIdForWrite(actor, requestedCompanyId);
  ensureCompanyRule(profile, companyId);
  ensureEmailAvailable(email);

  return sanitize(repository.users.create({
    companyId,
    profileId,
    name,
    email,
    passwordHash: hashPassword(password),
    createdBy: actor?.id ?? payload.createdBy ?? null,
  }));
}

function update(id, payload = {}, actor) {
  const existing = ensureExists(id);
  access.ensureUserManagementTarget(actor, existing);

  const name = requireString(payload.name, 'name');
  const email = requireEmail(payload.email);
  const profileId = requireInt(payload.profileId, 'profileId');
  const profile = resolveProfile(profileId);
  access.ensureUserProfileForManager(actor, profile);

  const requestedCompanyId = optionalInt(payload.companyId);
  const companyId = access.resolveCompanyIdForWrite(actor, requestedCompanyId);
  ensureCompanyRule(profile, companyId);
  ensureEmailAvailable(email, id);

  const passwordHash = payload.password ? hashPassword(requireString(payload.password, 'password')) : null;
  return sanitize(repository.users.update({
    id,
    companyId,
    profileId,
    name,
    email,
    passwordHash,
    updatedBy: actor?.id ?? null,
  }));
}

function deactivate(id, actor) {
  const existing = ensureExists(id);
  access.ensureUserManagementTarget(actor, existing);
  return sanitize(repository.users.setActive({ id, active: 0, updatedBy: actor?.id ?? null }));
}

function reactivate(id, actor) {
  const existing = ensureExists(id);
  access.ensureUserManagementTarget(actor, existing);
  return sanitize(repository.users.setActive({ id, active: 1, updatedBy: actor?.id ?? null }));
}

function remove(id, actor) {
  const existing = ensureExists(id);
  access.ensureUserManagementTarget(actor, existing);
  if (actor?.id && Number(actor.id) === Number(id)) throw new ApiError(400, 'O usuário logado não pode excluir a própria conta.');
  repository.users.remove(id);
}

function bootstrapAdmin() {
  const email = process.env.TAURUS_ADMIN_EMAIL;
  const password = process.env.TAURUS_ADMIN_PASSWORD;
  if (!email || !password) return;

  const normalizedEmail = email.trim().toLowerCase();
  if (repository.users.findByEmail(normalizedEmail)) return;

  const adminProfile = repository.profiles.findByName(ADMIN_PROFILE_NAME);
  if (!adminProfile) return;

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

module.exports = { list, findById, create, update, deactivate, reactivate, remove, bootstrapAdmin };
