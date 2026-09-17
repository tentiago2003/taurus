const service = require('../services/rawMessages.service');
const { sendJson } = require('../http/utils');

async function list(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const dataSourceId = url.searchParams.get('dataSourceId');
  const page = url.searchParams.get('page') || 1;
  const pageSize = url.searchParams.get('pageSize') || 50;
  const topic = url.searchParams.get('topic') || null;
  const from = url.searchParams.get('from') || null;
  const to = url.searchParams.get('to') || null;

  if (dataSourceId !== null && dataSourceId !== '' && !/^\d+$/.test(dataSourceId)) {
    return sendJson(res, 400, { error: 'dataSourceId inválido.' });
  }

  sendJson(res, 200, service.listPaged({
    dataSourceId: dataSourceId === null || dataSourceId === '' ? null : Number(dataSourceId),
    topic, from, to, page, pageSize,
  }));
}

module.exports = { list };
