const { Router } = require('../http/router');
const companiesRoutes = require('./companies.routes');
const profilesRoutes = require('./profiles.routes');
const usersRoutes = require('./users.routes');
const connectionsRoutes = require('./connections.routes');
const dataSourcesRoutes = require('./dataSources.routes');
const dashboardsRoutes = require('./dashboards.routes');
const widgetsRoutes = require('./widgets.routes');
const authRoutes = require('./auth.routes');
const systemSettingsRoutes = require('./systemSettings.routes');
const rawMessagesRoutes = require('./rawMessages.routes');
const interpretationRoutes = require('./interpretation.routes');
const measurementsRoutes = require('./measurements.routes');

const router = new Router();

for (const routes of [
  companiesRoutes,
  profilesRoutes,
  usersRoutes,
  connectionsRoutes,
  dataSourcesRoutes,
  dashboardsRoutes,
  widgetsRoutes,
  authRoutes,
  systemSettingsRoutes,
  rawMessagesRoutes,
  interpretationRoutes,
  measurementsRoutes,
]) {
  routes.register(router);
}

module.exports = router;
