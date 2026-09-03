const controller = require('../controllers/dataSources.controller');
const { asyncHandler } = require('../http/utils');

function register(router) {
  router.get('/api/data-sources', asyncHandler(controller.list));
  router.post('/api/data-sources', asyncHandler(controller.create));
}

module.exports = { register };
