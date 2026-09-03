const controller = require('../controllers/companies.controller');
const { asyncHandler } = require('../http/utils');

function register(router) {
  router.get('/api/companies', asyncHandler(controller.list));
  router.post('/api/companies', asyncHandler(controller.create));
}

module.exports = { register };
