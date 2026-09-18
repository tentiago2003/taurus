const service = require('../services/interpretation.service');
const { ApiError } = require('../http/errors');
const { readJsonBody, sendJson } = require('../http/utils');

function parseDataSourceId(value) {
  if (!/^\d+$/.test(String(value))) {
    throw new ApiError(400, 'dataSourceId inválido.');
  }
  return Number(value);
}

async function show(req, res, params) {
  const dataSourceId = parseDataSourceId(params.id);
  sendJson(res, 200, { interpretation: service.get(dataSourceId) });
}

async function update(req, res, params) {
  const dataSourceId = parseDataSourceId(params.id);
  const body = await readJsonBody(req);
  sendJson(res, 200, {
    interpretation: service.save(dataSourceId, body.interpretation ?? body, req.user.id),
  });
}

async function test(req, res, params) {
  const dataSourceId = parseDataSourceId(params.id);
  const body = await readJsonBody(req);
  const configuration = body.interpretation ?? body.configuration;
  if (!configuration) {
    const current = service.get(dataSourceId);
    if (!current) {
      throw new ApiError(400, 'Informe uma configuração de interpretação para o teste.');
    }
    body.interpretation = current;
  }

  if (body.payload === undefined || body.payload === null) {
    throw new ApiError(400, 'Informe o payload para testar.');
  }

  const result = service.interpret({
    payload: typeof body.payload === 'string' ? body.payload : JSON.stringify(body.payload),
    configuration: body.interpretation,
    receivedAt: body.receivedAt || new Date().toISOString(),
  });

  sendJson(res, 200, result);
}

module.exports = { show, update, test };
