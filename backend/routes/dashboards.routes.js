const controller = require('../controllers/dashboards.controller');
const { asyncHandler } = require('../http/utils');

function register(router) {
  router.get('/api/dashboards', asyncHandler(controller.list));
  router.post('/api/dashboards', asyncHandler(controller.create));
}

module.exports = { register };
