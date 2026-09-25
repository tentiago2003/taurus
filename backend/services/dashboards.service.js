const repository = require('../db/repository');
const { ApiError } = require('../http/errors');
const { requireString, requireInt, optionalString } = require('./validation');
const access = require('./access.service');

const WIDGET_TYPES = ['value', 'chart', 'table'];

function validateWidgetType(type) {
  if (!WIDGET_TYPES.includes(type)) {
    throw new ApiError(400, `Tipo de widget inválido. Use: ${WIDGET_TYPES.join(', ')}.`);
  }
}

function getWidgetData(widget) {
  const configuration = widget.configuration || {};
  const dataSourceIds = widget.dataSourceIdsOverride || repository.widgets.listDataSourceIds(widget.id);
  const metric = configuration.metric || 'value';
  const periodHours = Number(configuration.period_hours || 24);
  const since = new Date(Date.now() - periodHours * 60 * 60 * 1000).toISOString();

  const sources = dataSourceIds
    .map((id) => repository.dataSources.findById(id))
    .filter(Boolean);

  const sourceData = sources.map((source) => {
    if (widget.type === 'value') {
      const rows = repository.measurements.listByDataSource(source.id, { limit: 1000 })
        .filter((row) => row.metric === metric);
      const latest = rows[0] || null;
      return {
        dataSourceId: source.id,
        dataSourceName: source.name,
        metric,
        latest,
      };
    }

    const rows = repository.measurements.listByDataSource(source.id, { limit: 1000 })
      .filter((row) => row.metric === metric && row.timestamp >= since)
      .sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));

    return {
      dataSourceId: source.id,
      dataSourceName: source.name,
      metric,
      rows: widget.type === 'table' ? rows.slice().reverse().slice(0, 50) : rows,
    };
  });

  return {
    metric,
    unit: configuration.unit || '',
    decimalPlaces: Number(configuration.decimal_places ?? 1),
    size: configuration.size || null,
    sources: sourceData,
  };
}

function hydrateDashboard(dashboard) {
  const widgets = repository.widgets.listByDashboard(dashboard.id).map((widget) => {
    const dataSourceIds = repository.widgets.listDataSourceIds(widget.id)
      .filter((dataSourceId) => Number(access.companyIdFromDataSource(dataSourceId)) === Number(dashboard.company_id));
    const scopedWidget = { ...widget };
    const data = getWidgetData({ ...scopedWidget, dataSourceIdsOverride: dataSourceIds });
    return { ...scopedWidget, data_source_ids: dataSourceIds, data };
  });
  return { ...dashboard, widgets };
}

function list(user) {
  ensureDemoDashboard();

  if (!user) {
    return repository.dashboards.list();
  }

  if (user.profile_name === 'Admin') {
    return repository.dashboards.list();
  }

  return repository.dashboards.listByCompany(Number(user.company_id)).map((dashboard) => ({
    ...dashboard,
    company_name: repository.companies.findById(dashboard.company_id)?.name || null
  }));
}

function get(id, user) {
  const dashboard = repository.dashboards.findById(id);
  if (!dashboard) throw new ApiError(404, 'Dashboard não encontrado.');
  access.ensureCompanyAccess(user, dashboard.company_id);
  return hydrateDashboard(dashboard);
}

function create(payload = {}, createdBy = null, user = null) {
  access.ensureAdminOrManager(user);
  const requestedCompanyId = payload.companyId === undefined || payload.companyId === null || payload.companyId === '' ? null : requireInt(payload.companyId, 'companyId');
  const companyId = access.resolveCompanyIdForWrite(user, requestedCompanyId);
  const name = requireString(payload.name, 'name');
  const description = optionalString(payload.description);
  const isDefault = Boolean(payload.isDefault);

  if (!repository.companies.findById(companyId)) {
    throw new ApiError(400, 'Empresa informada não existe.');
  }

  return repository.dashboards.create({ companyId, name, description, isDefault, createdBy });
}

function update(id, payload = {}, updatedBy = null, user = null) {
  const existing = repository.dashboards.findById(id);
  if (!existing) throw new ApiError(404, 'Dashboard não encontrado.');
  access.ensureAdminOrManager(user);
  access.ensureCompanyAccess(user, existing.company_id);
  const name = requireString(payload.name, 'name');
  const description = optionalString(payload.description);
  const isDefault = Boolean(payload.isDefault);
  return repository.dashboards.update({ id, name, description, isDefault, updatedBy });
}

function remove(id, user) {
  const existing = repository.dashboards.findById(id);
  if (!existing) throw new ApiError(404, 'Dashboard não encontrado.');
  access.ensureAdminOrManager(user);
  access.ensureCompanyAccess(user, existing.company_id);
  repository.dashboards.remove(id);
}

function createWidget(payload = {}, userId = null, user = null) {
  const dashboardId = requireInt(payload.dashboardId, 'dashboardId');
  const name = requireString(payload.name, 'name');
  const type = requireString(payload.type, 'type');
  validateWidgetType(type);
  const position = Number.isInteger(Number(payload.position)) ? Number(payload.position) : 0;
  const configuration = payload.configuration || {};
  const dataSourceIds = Array.isArray(payload.dataSourceIds)
    ? [...new Set(payload.dataSourceIds.map(Number).filter(Number.isInteger))]
    : [];

  const dashboard = repository.dashboards.findById(dashboardId);
  if (!dashboard) throw new ApiError(400, 'Dashboard informado não existe.');
  access.ensureAdminOrManager(user);
  access.ensureCompanyAccess(user, dashboard.company_id);
  if (dataSourceIds.length === 0) {
    throw new ApiError(400, 'Selecione ao menos uma Data Source.');
  }
  access.ensureDataSourcesSameCompany(dataSourceIds, dashboard.company_id);

  return repository.widgets.create({
    dashboardId,
    name,
    type,
    position,
    configuration,
    dataSourceIds,
    createdBy: userId,
  });
}

function updateWidget(id, payload = {}, userId = null, user = null) {
  const existing = repository.widgets.findById(id);
  if (!existing) throw new ApiError(404, 'Widget não encontrado.');
  const dashboardCompanyId = access.companyIdFromWidget(id);
  access.ensureAdminOrManager(user);
  access.ensureCompanyAccess(user, dashboardCompanyId);
  const name = requireString(payload.name, 'name');
  const type = requireString(payload.type, 'type');
  validateWidgetType(type);
  const position = Number.isInteger(Number(payload.position)) ? Number(payload.position) : existing.position;
  const configuration = payload.configuration || {};
  const dataSourceIds = Array.isArray(payload.dataSourceIds)
    ? [...new Set(payload.dataSourceIds.map(Number).filter(Number.isInteger))]
    : repository.widgets.listDataSourceIds(id);

  if (dataSourceIds.length === 0) throw new ApiError(400, 'Selecione ao menos uma Data Source.');
  access.ensureDataSourcesSameCompany(dataSourceIds, dashboardCompanyId);

  return repository.widgets.update({ id, name, type, position, configuration, dataSourceIds, updatedBy: userId });
}

function removeWidget(id, user) {
  const existing = repository.widgets.findById(id);
  if (!existing) throw new ApiError(404, 'Widget não encontrado.');
  access.ensureAdminOrManager(user);
  access.ensureCompanyAccess(user, access.companyIdFromWidget(id));
  repository.widgets.remove(id);
}

function ensureDemoDashboard() {
  const db = require('../db').getDatabase();
  const candidates = db.prepare(
    `SELECT c.id AS company_id, ds.id AS data_source_id
     FROM companies c
     JOIN connections cn ON cn.company_id = c.id
     JOIN data_sources ds ON ds.connection_id = cn.id
     JOIN measurements m ON m.data_source_id = ds.id
     GROUP BY c.id, ds.id
     ORDER BY c.id, ds.id`
  ).all();

  if (!candidates.length) return null;
  const companyId = candidates[0].company_id;
  const existing = repository.dashboards.listByCompany(companyId);
  if (existing.length) return existing[0];

  const dashboard = repository.dashboards.create({
    companyId,
    name: 'Monitoramento de Temperaturas',
    description: 'Dashboard de demonstração criado automaticamente com as medições existentes.',
    isDefault: 1,
  });

  const sources = db.prepare(
    `SELECT ds.id, ds.name, m.metric
     FROM data_sources ds
     JOIN connections cn ON cn.id = ds.connection_id
     JOIN measurements m ON m.data_source_id = ds.id
     WHERE cn.company_id = ?
     GROUP BY ds.id, m.metric
     ORDER BY ds.id, m.metric`
  ).all(companyId);

  const preferred = [];
  for (const row of sources) {
    if (!preferred.some((item) => item.metric === row.metric)) preferred.push(row);
  }

  const metrics = preferred.slice(0, 2);
  metrics.forEach((item, index) => {
    const title = item.metric === 'temperature_1' ? 'Temperatura 1' :
      item.metric === 'temperature_2' ? 'Temperatura 2' : item.metric;
    repository.widgets.create({
      dashboardId: dashboard.id,
      name: title,
      type: 'value',
      position: index,
      configuration: {
        metric: item.metric,
        unit: item.metric.startsWith('temperature') ? '°C' : '',
        decimal_places: 1,
        size: '1x1',
      },
      dataSourceIds: [item.id],
    });
  });

  if (metrics.length) {
    repository.widgets.create({
      dashboardId: dashboard.id,
      name: 'Histórico de temperaturas',
      type: 'chart',
      position: 2,
      configuration: {
        metric: metrics[0].metric,
        period_hours: 24,
        unit: metrics[0].metric.startsWith('temperature') ? '°C' : '',
        decimal_places: 1,
        size: '2x2',
      },
      dataSourceIds: [metrics[0].id],
    });
  }

  return dashboard;
}

module.exports = {
  list,
  get,
  create,
  update,
  remove,
  createWidget,
  updateWidget,
  removeWidget,
  WIDGET_TYPES,
};
