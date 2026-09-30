const controller = require('../controllers/export.controller');
const { asyncHandler } = require('../http/utils');

function register(router) {
  router.get('/api/exports/measurements', asyncHandler(controller.measurements));
  router.get('/api/exports/raw-messages', asyncHandler(controller.rawMessages));
}

module.exports = { register };
