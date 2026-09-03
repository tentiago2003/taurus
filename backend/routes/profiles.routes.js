const controller = require('../controllers/profiles.controller');
const { asyncHandler } = require('../http/utils');

function register(router) {
  router.get('/api/profiles', asyncHandler(controller.list));
  router.post('/api/profiles', asyncHandler(controller.create));
}

module.exports = { register };
