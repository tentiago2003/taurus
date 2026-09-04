const router = require('../routes');
const { sendJson } = require('./utils');
const authService = require('../services/auth.service');

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

  const isPublicRoute = pathname === '/api/auth/login' || pathname === '/api/auth/me' || pathname === '/api/auth/logout';
  if (!isPublicRoute) {
    const user = authService.getUserFromRequest(req);
    if (!user) {
      sendJson(res, 401, { error: 'Não autenticado.' });
      return true;
    }
    req.user = user;
  }

  await match.handler(req, res, match.params);
  return true;
}

module.exports = { handleApiRequest };
