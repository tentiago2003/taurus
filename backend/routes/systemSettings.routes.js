const controller = require('../controllers/systemSettings.controller');
const { asyncHandler } = require('../http/utils');

function register(router) {
  router.get('/api/system-settings', asyncHandler(controller.show));
  router.put('/api/system-settings', asyncHandler(controller.update));
}

module.exports = { register };
