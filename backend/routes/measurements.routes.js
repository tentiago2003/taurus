const controller = require('../controllers/measurements.controller');
const { asyncHandler } = require('../http/utils');

function register(router) {
  router.get('/api/measurements', asyncHandler(controller.list));
}

module.exports = { register };
