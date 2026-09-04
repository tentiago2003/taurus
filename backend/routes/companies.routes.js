const controller = require('../controllers/companies.controller');
const { asyncHandler } = require('../http/utils');

function register(router) {
  router.get('/api/companies', asyncHandler(controller.list));
  router.post('/api/companies', asyncHandler(controller.create));
  router.put('/api/companies/:id', asyncHandler(controller.update));
  router.post('/api/companies/:id/deactivate', asyncHandler(controller.deactivate));
  router.post('/api/companies/:id/reactivate', asyncHandler(controller.reactivate));
  router.delete('/api/companies/:id', asyncHandler(controller.remove));
}

module.exports = { register };
