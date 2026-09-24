const controller = require('../controllers/dashboards.controller');
const { asyncHandler } = require('../http/utils');

function register(router) {
  router.get('/api/dashboards', asyncHandler(controller.list));
  router.get('/api/dashboards/:id', asyncHandler(controller.get));
  router.post('/api/dashboards', asyncHandler(controller.create));
  router.put('/api/dashboards/:id', asyncHandler(controller.update));
  router.delete('/api/dashboards/:id', asyncHandler(controller.remove));
  router.post('/api/widgets', asyncHandler(controller.createWidget));
  router.put('/api/widgets/:id', asyncHandler(controller.updateWidget));
  router.delete('/api/widgets/:id', asyncHandler(controller.removeWidget));
}
module.exports = { register };
