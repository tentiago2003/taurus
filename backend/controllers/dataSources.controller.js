const service = require('../services/dataSources.service');
const { readJsonBody, sendJson } = require('../http/utils');

async function list(req, res) {
  sendJson(res, 200, service.list(req.user));
}

async function create(req, res) {
  const body = await readJsonBody(req);
  const created = service.create(body, req.user);
  sendJson(res, 201, created);
}

module.exports = { list, create };
