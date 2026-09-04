const crypto = require('crypto');
const repository = require('../db/repository');
const { ApiError } = require('../http/errors');
const { requireEmail, requireString } = require('./validation');
const { verifyPassword } = require('./password');

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
  return safe;
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

  return user;
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
  logout,
  setSessionCookie,
  clearSessionCookie,
};
