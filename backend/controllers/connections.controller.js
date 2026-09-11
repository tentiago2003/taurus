const service = require('../services/connections.service');
const { readJsonBody, sendJson } = require('../http/utils');
const { parseIdParam } = require('../services/validation');

async function list(req, res) {
  sendJson(res, 200, service.list());
}

async function get(req, res, params) {
  sendJson(res, 200, service.get(parseIdParam(params.id)));
}

async function create(req, res) {
  const body = await readJsonBody(req);
  const created = service.create({ ...body, createdBy: req.user?.id ?? null });
  sendJson(res, 201, created);
}

async function update(req, res, params) {
  const body = await readJsonBody(req);
  const updated = service.update(parseIdParam(params.id), { ...body, updatedBy: req.user?.id ?? null });
  sendJson(res, 200, updated);
}

async function deactivate(req, res, params) {
  sendJson(res, 200, service.deactivate(parseIdParam(params.id)));
}

async function reactivate(req, res, params) {
  sendJson(res, 200, service.reactivate(parseIdParam(params.id)));
}

async function remove(req, res, params) {
  service.remove(parseIdParam(params.id));
  res.statusCode = 204;
  res.end();
}

module.exports = { list, get, create, update, deactivate, reactivate, remove };
