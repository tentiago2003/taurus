const controller = require('../controllers/rawMessages.controller');
const { asyncHandler } = require('../http/utils');

function register(router) {
  router.get('/api/raw-messages', asyncHandler(controller.list));
}

module.exports = { register };
