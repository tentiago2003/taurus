const service = require('../services/companies.service');
const { readJsonBody, sendJson } = require('../http/utils');
const { parseIdParam } = require('../services/validation');

async function list(req, res) {
  sendJson(res, 200, service.list(req.user));
}

async function create(req, res) {
  const body = await readJsonBody(req);
  const created = service.create(body, req.user);
  sendJson(res, 201, created);
}

async function update(req, res, params) {
  const id = parseIdParam(params.id);
  const body = await readJsonBody(req);
  const updated = service.update(id, body, req.user);
  sendJson(res, 200, updated);
}

async function deactivate(req, res, params) {
  const id = parseIdParam(params.id);
  sendJson(res, 200, service.deactivate(id, req.user));
}

async function reactivate(req, res, params) {
  const id = parseIdParam(params.id);
  sendJson(res, 200, service.reactivate(id, req.user));
}

async function remove(req, res, params) {
  const id = parseIdParam(params.id);
  service.remove(id, req.user);
  res.statusCode = 204;
  res.end();
}

module.exports = { list, create, update, deactivate, reactivate, remove };
