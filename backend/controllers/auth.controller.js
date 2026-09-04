const service = require('../services/auth.service');
const { readJsonBody, sendJson } = require('../http/utils');

async function login(req, res) {
  const body = await readJsonBody(req);
  const result = service.login(body.email, body.password);
  service.setSessionCookie(res, req, result.token);
  sendJson(res, 200, { user: result.user });
}

async function me(req, res) {
  sendJson(res, 200, { user: service.getUserFromRequest(req) });
}

async function logout(req, res) {
  service.logout(req);
  service.clearSessionCookie(res, req);
  sendJson(res, 200, { ok: true });
}

module.exports = { login, me, logout };
