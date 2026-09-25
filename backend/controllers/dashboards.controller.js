const service = require('../services/dashboards.service');
const { readJsonBody, sendJson } = require('../http/utils');

async function list(req, res) {
  sendJson(res, 200, service.list(req.user));
}
async function get(req, res, params) {
  sendJson(res, 200, service.get(Number(params.id), req.user));
}
async function create(req, res) {
  const body = await readJsonBody(req);
  sendJson(res, 201, service.create(body, req.user?.id ?? null, req.user));
}
async function update(req, res, params) {
  const body = await readJsonBody(req);
  sendJson(res, 200, service.update(Number(params.id), body, req.user?.id ?? null, req.user));
}
async function remove(req, res, params) {
  service.remove(Number(params.id), req.user);
  sendJson(res, 204, null);
}
async function createWidget(req, res) {
  const body = await readJsonBody(req);
  sendJson(res, 201, service.createWidget(body, req.user?.id ?? null, req.user));
}
async function updateWidget(req, res, params) {
  const body = await readJsonBody(req);
  sendJson(res, 200, service.updateWidget(Number(params.id), body, req.user?.id ?? null, req.user));
}
async function removeWidget(req, res, params) {
  service.removeWidget(Number(params.id), req.user);
  sendJson(res, 204, null);
}
module.exports = { list, get, create, update, remove, createWidget, updateWidget, removeWidget };
