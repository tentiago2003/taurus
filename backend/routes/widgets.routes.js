const controller = require('../controllers/widgets.controller');
const { asyncHandler } = require('../http/utils');

function register(router) {
  router.get('/api/widgets', asyncHandler(controller.list));
  router.post('/api/widgets', asyncHandler(controller.create));
}

module.exports = { register };
