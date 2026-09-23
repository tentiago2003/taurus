const service = require('../services/measurements.service');
const { sendJson } = require('../http/utils');

async function list(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const dataSourceId = url.searchParams.get('dataSourceId');
  const metric = url.searchParams.get('metric') || null;
  const from = url.searchParams.get('from') || null;
  const to = url.searchParams.get('to') || null;
  const page = url.searchParams.get('page') || 1;
  const pageSize = url.searchParams.get('pageSize') || 50;

  if (dataSourceId !== null && dataSourceId !== '' && !/^\d+$/.test(dataSourceId)) {
    return sendJson(res, 400, { error: 'dataSourceId inválido.' });
  }

  sendJson(res, 200, service.listPaged({
    dataSourceId: dataSourceId === null || dataSourceId === '' ? null : Number(dataSourceId),
    metric, from, to, page, pageSize,
  }));
}

module.exports = { list };
