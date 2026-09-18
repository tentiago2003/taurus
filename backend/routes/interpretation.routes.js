const controller = require('../controllers/interpretation.controller');
const { asyncHandler } = require('../http/utils');

function register(router) {
  router.get('/api/data-sources/:id/interpretation', asyncHandler(controller.show));
  router.put('/api/data-sources/:id/interpretation', asyncHandler(controller.update));
  router.post('/api/data-sources/:id/interpretation/test', asyncHandler(controller.test));
}

module.exports = { register };
