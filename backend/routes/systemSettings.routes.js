const controller = require('../controllers/systemSettings.controller');
const { asyncHandler } = require('../http/utils');

function register(router) {
  router.get('/api/system-settings', asyncHandler(controller.show));
  router.put('/api/system-settings', asyncHandler(controller.update));
  router.get('/api/system-settings/cleanup/status', asyncHandler(controller.cleanupStatus));
  router.get('/api/system-settings/cleanup/history', asyncHandler(controller.cleanupHistory));
  router.post('/api/system-settings/cleanup/preview', asyncHandler(controller.cleanupPreview));
  router.post('/api/system-settings/cleanup/manual', asyncHandler(controller.cleanupManual));
}

module.exports = { register };
