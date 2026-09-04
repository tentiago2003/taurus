const controller = require('../controllers/users.controller');
const { asyncHandler } = require('../http/utils');

function register(router) {
  router.get('/api/users', asyncHandler(controller.list));
  router.get('/api/users/:id', asyncHandler(controller.show));
  router.post('/api/users', asyncHandler(controller.create));
  router.put('/api/users/:id', asyncHandler(controller.update));
  router.post('/api/users/:id/deactivate', asyncHandler(controller.deactivate));
  router.post('/api/users/:id/reactivate', asyncHandler(controller.reactivate));
  router.delete('/api/users/:id', asyncHandler(controller.remove));
}

module.exports = { register };
