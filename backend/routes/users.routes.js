const controller = require('../controllers/users.controller');
const { asyncHandler } = require('../http/utils');

function register(router) {
  router.get('/api/users', asyncHandler(controller.list));
  router.post('/api/users', asyncHandler(controller.create));
}

module.exports = { register };
