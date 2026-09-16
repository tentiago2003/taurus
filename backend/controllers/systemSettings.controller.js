const service = require('../services/systemSettings.service');
const { readJsonBody, sendJson } = require('../http/utils');

async function show(req, res) {
  sendJson(res, 200, service.get());
}

async function update(req, res) {
  const body = await readJsonBody(req);
  sendJson(res, 200, service.update(body, req.user.id));
}

module.exports = { show, update };
