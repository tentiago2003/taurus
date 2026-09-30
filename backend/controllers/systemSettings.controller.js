const service = require('../services/systemSettings.service');
const { readJsonBody, sendJson } = require('../http/utils');

async function show(req, res) {
  sendJson(res, 200, service.get());
}

async function update(req, res) {
  const body = await readJsonBody(req);
  sendJson(res, 200, service.update(body, req.user.id));
}

async function cleanupStatus(req, res) {
  sendJson(res, 200, service.getCleanupStatus());
}

async function cleanupHistory(req, res) {
  const limit = Number(new URL(req.url, 'http://localhost').searchParams.get('limit') || 50);
  sendJson(res, 200, service.getCleanupHistory(limit));
}

async function cleanupPreview(req, res) {
  const body = await readJsonBody(req);
  sendJson(res, 200, service.previewManualCleanup(body));
}

async function cleanupManual(req, res) {
  const body = await readJsonBody(req);
  sendJson(res, 200, service.executeManualCleanup(body, req.user.id));
}

module.exports = {
  show,
  update,
  cleanupStatus,
  cleanupHistory,
  cleanupPreview,
  cleanupManual,
};
