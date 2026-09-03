const controller = require('../controllers/connections.controller');
const { asyncHandler } = require('../http/utils');

function register(router) {
  router.get('/api/connections', asyncHandler(controller.list));
  router.post('/api/connections', asyncHandler(controller.create));
}

module.exports = { register };
