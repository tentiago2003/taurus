const service = require('../services/connections.service');
const repository = require('../db/repository');
const { readJsonBody, sendJson } = require('../http/utils');
const { parseIdParam } = require('../services/validation');
const connectionManager = require('../services/connection-manager.service');

async function list(req, res) {
  sendJson(res, 200, service.list(req.user).map((connection) => ({ ...connection, runtime: connectionManager.getStatus(connection.id) })));
}

async function get(req, res, params) {
  const id = parseIdParam(params.id);
  sendJson(res, 200, { ...service.get(id, req.user), runtime: connectionManager.getStatus(id) });
}

async function create(req, res) {
  const body = await readJsonBody(req);
  const created = service.create({ ...body, createdBy: req.user?.id ?? null }, req.user);
  sendJson(res, 201, { ...created, runtime: connectionManager.getStatus(created.id) });
}

async function update(req, res, params) {
  const body = await readJsonBody(req);
  const updated = service.update(parseIdParam(params.id), { ...body, updatedBy: req.user?.id ?? null }, req.user);
  connectionManager.sync(updated.id);
  sendJson(res, 200, { ...updated, runtime: connectionManager.getStatus(updated.id) });
}

async function deactivate(req, res, params) {
  const id = parseIdParam(params.id);
  const updated = service.deactivate(id, req.user);
  connectionManager.stop(id);
  sendJson(res, 200, { ...updated, runtime: connectionManager.getStatus(id) });
}

async function reactivate(req, res, params) {
  const id = parseIdParam(params.id);
  const updated = service.reactivate(id, req.user);
  connectionManager.start(id);
  sendJson(res, 200, { ...updated, runtime: connectionManager.getStatus(id) });
}

async function reconnect(req, res, params) {
  const id = parseIdParam(params.id);
  service.get(id, req.user);
  sendJson(res, 200, connectionManager.reconnect(id));
}

async function events(req, res, params) {
  const id = parseIdParam(params.id);
  service.get(id, req.user);
  const url = new URL(req.url, 'http://localhost');
  const eventType = url.searchParams.get('eventType') || null;
  const from = url.searchParams.get('from') || null;
  const to = url.searchParams.get('to') || null;
  const page = url.searchParams.get('page') || 1;
  const pageSize = url.searchParams.get('pageSize') || 50;
  sendJson(res, 200, repository.connectionEvents.listPagedByConnection(id, { page, pageSize, eventType, from, to }));
}

async function remove(req, res, params) {
  const id = parseIdParam(params.id);
  connectionManager.stop(id, { log: false });
  service.remove(id, req.user);
  res.statusCode = 204;
  res.end();
}

module.exports = { list, get, create, update, deactivate, reactivate, reconnect, events, remove };
