const controller = require('../controllers/auth.controller');
const { asyncHandler } = require('../http/utils');

function register(router) {
  router.post('/api/auth/login', asyncHandler(controller.login));
  router.get('/api/auth/me', asyncHandler(controller.me));
  router.post('/api/auth/logout', asyncHandler(controller.logout));
}

module.exports = { register };
