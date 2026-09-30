const service = require('../services/export.service');
const { ApiError } = require('../http/errors');

function parseCommon(url) {
  const dataSourceId = url.searchParams.get('dataSourceId');
  if (dataSourceId !== null && dataSourceId !== '' && !/^\d+$/.test(dataSourceId)) {
    throw new ApiError(400, 'dataSourceId inválido.');
  }
  return {
    dataSourceId: dataSourceId === null || dataSourceId === '' ? null : Number(dataSourceId),
    from: url.searchParams.get('from') || null,
    to: url.searchParams.get('to') || null,
  };
}

function sendXlsx(res, filename, buffer) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  res.end(buffer);
}

async function measurements(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const options = { ...parseCommon(url), metric: url.searchParams.get('metric') || null };
  sendXlsx(res, 'medicoes.xlsx', service.measurements(options, req.user));
}

async function rawMessages(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const options = { ...parseCommon(url), topic: url.searchParams.get('topic') || null };
  sendXlsx(res, 'mensagens-brutas.xlsx', service.rawMessages(options, req.user));
}

module.exports = { measurements, rawMessages };
