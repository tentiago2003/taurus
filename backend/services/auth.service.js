const crypto = require('crypto');
const repository = require('../db/repository');
const { ApiError } = require('../http/errors');
const { requireEmail, requireString } = require('./validation');
const { verifyPassword, hashPassword } = require('./password');

const sessions = new Map();
const SESSION_COOKIE = 'taurus_session';

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=');
        return index === -1 ? [part, ''] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function cookieOptions(req) {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const secure = forwardedProto === 'https' || req.socket.encrypted;
  return `Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
}

function publicUser(user) {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  const profile = repository.profiles.findById(user.profile_id);
  const company = user.company_id ? repository.companies.findById(user.company_id) : null;
  return { ...safe, profile_name: profile?.name ?? null, company_name: company?.name ?? null };
}

function login(email, password) {
  const normalizedEmail = requireEmail(email);
  const rawPassword = requireString(password, 'password');
  const user = repository.users.findByEmail(normalizedEmail);

  if (!user || !user.active || !verifyPassword(rawPassword, user.password_hash)) {
    throw new ApiError(401, 'E-mail ou senha inválidos.');
  }

  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, user.id);
  return { token, user: publicUser(user) };
}

function getUserFromRequest(req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;

  const userId = sessions.get(token);
  if (!userId) return null;

  const user = repository.users.findById(userId);
  if (!user || !user.active) {
    sessions.delete(token);
    return null;
  }

  return publicUser(user);
}

function updateCurrentUser(req, payload = {}) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser) throw new ApiError(401, 'Sessão inválida.');

  const name = requireString(payload.name, 'name');
  const email = requireEmail(payload.email);
  const existing = repository.users.findById(currentUser.id);
  if (!existing) throw new ApiError(404, 'Usuário não encontrado.');

  const emailOwner = repository.users.findByEmail(email);
  if (emailOwner && Number(emailOwner.id) !== Number(existing.id)) {
    throw new ApiError(409, 'Já existe um usuário com este e-mail.');
  }

  let passwordHash = null;
  if (payload.password) {
    const password = requireString(payload.password, 'password');
    const passwordConfirmation = requireString(payload.passwordConfirmation, 'passwordConfirmation');
    if (password !== passwordConfirmation) throw new ApiError(400, 'A confirmação da senha não confere.');
    passwordHash = hashPassword(password);
  }

  const updated = repository.users.update({
    id: existing.id,
    companyId: existing.company_id,
    profileId: existing.profile_id,
    name,
    email,
    passwordHash,
    updatedBy: existing.id,
  });

  return publicUser(updated);
}

function logout(req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  if (token) sessions.delete(token);
}

function setSessionCookie(res, req, token) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; ${cookieOptions(req)}`);
}

function clearSessionCookie(res, req) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Max-Age=0; ${cookieOptions(req)}`);
}

module.exports = {
  SESSION_COOKIE,
  login,
  getUserFromRequest,
  updateCurrentUser,
  logout,
  setSessionCookie,
  clearSessionCookie,
};
