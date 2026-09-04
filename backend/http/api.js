const router = require('../routes');
const { sendJson } = require('./utils');

/**
 * Tenta atender a requisição como chamada de API (prefixo /api/).
 * Retorna true se a requisição foi tratada (rota encontrada ou não),
 * false se não for uma rota de API (deixa o chamador seguir o fluxo normal).
 */
async function handleApiRequest(req, res) {
  const { pathname } = new URL(req.url, 'http://localhost');

  if (!pathname.startsWith('/api/')) {
    return false;
  }

  const match = router.find(req.method, pathname);
  if (!match) {
    sendJson(res, 404, { error: 'Rota não encontrada.' });
    return true;
  }

  await match.handler(req, res, match.params);
  return true;
}

module.exports = { handleApiRequest };
