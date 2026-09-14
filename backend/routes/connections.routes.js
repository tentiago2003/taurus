const controller = require('../controllers/connections.controller');
const { asyncHandler } = require('../http/utils');

function register(router) {
  router.get('/api/connections', asyncHandler(controller.list));
  router.get('/api/connections/:id', asyncHandler(controller.get));
  router.post('/api/connections', asyncHandler(controller.create));
  router.put('/api/connections/:id', asyncHandler(controller.update));
  router.post('/api/connections/:id/deactivate', asyncHandler(controller.deactivate));
  router.post('/api/connections/:id/reactivate', asyncHandler(controller.reactivate));
  router.post('/api/connections/:id/reconnect', asyncHandler(controller.reconnect));
  router.get('/api/connections/:id/events', asyncHandler(controller.events));
  router.delete('/api/connections/:id', asyncHandler(controller.remove));
}

module.exports = { register };
