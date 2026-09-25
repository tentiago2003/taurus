const repository = require('../db/repository');
const { ApiError } = require('../http/errors');
const {
  PROFILE_ADMIN,
  PROFILE_MANAGER,
  PROFILE_VIEWER,
} = require('../http/authorization');

function profileName(user) {
  return user?.profile_name || repository.profiles.findById(user?.profile_id)?.name || null;
}

function isAdmin(user) { return profileName(user) === PROFILE_ADMIN; }
function isManager(user) { return profileName(user) === PROFILE_MANAGER; }
function isViewer(user) { return profileName(user) === PROFILE_VIEWER; }

function ensureAdminOrManager(user) {
  if (!user) return;
  if (!isAdmin(user) && !isManager(user)) {
    throw new ApiError(403, 'Usuário sem permissão para esta operação.');
  }
}

function ensureAdmin(user) {
  if (!user) return;
  if (!isAdmin(user)) throw new ApiError(403, 'Apenas usuários Admin podem realizar esta operação.');
}

function ensureCompanyAccess(user, companyId) {
  if (!user || isAdmin(user)) return;
  if (!user.company_id || Number(user.company_id) !== Number(companyId)) {
    throw new ApiError(403, 'Usuário sem acesso à empresa informada.');
  }
}

function ensureCompanyExists(companyId) {
  if (!repository.companies.findById(companyId)) {
    throw new ApiError(400, 'Empresa informada não existe.');
  }
}

function resolveCompanyIdForWrite(user, requestedCompanyId) {
  if (!user || isAdmin(user)) return requestedCompanyId;
  if (!user.company_id) throw new ApiError(403, 'Usuário não possui empresa vinculada.');
  if (requestedCompanyId !== undefined && requestedCompanyId !== null && Number(requestedCompanyId) !== Number(user.company_id)) {
    throw new ApiError(403, 'Usuário não pode operar em outra empresa.');
  }
  return Number(user.company_id);
}

function companyIdFromConnection(connectionId) {
  const connection = repository.connections.findById(connectionId);
  if (!connection) throw new ApiError(404, 'Conexão não encontrada.');
  return connection.company_id;
}

function companyIdFromDataSource(dataSourceId) {
  const dataSource = repository.dataSources.findById(dataSourceId);
  if (!dataSource) throw new ApiError(404, 'Fonte de dados não encontrada.');
  return companyIdFromConnection(dataSource.connection_id);
}

function companyIdFromDashboard(dashboardId) {
  const dashboard = repository.dashboards.findById(dashboardId);
  if (!dashboard) throw new ApiError(404, 'Dashboard não encontrado.');
  return dashboard.company_id;
}

function companyIdFromWidget(widgetId) {
  const widget = repository.widgets.findById(widgetId);
  if (!widget) throw new ApiError(404, 'Widget não encontrado.');
  return companyIdFromDashboard(widget.dashboard_id);
}

function ensureDataSourcesSameCompany(dataSourceIds, companyId) {
  for (const dataSourceId of dataSourceIds) {
    const sourceCompanyId = companyIdFromDataSource(dataSourceId);
    if (Number(sourceCompanyId) !== Number(companyId)) {
      throw new ApiError(400, 'Todos os Data Sources do widget devem pertencer à mesma empresa do dashboard.');
    }
  }
}

function ensureUserManagementTarget(actor, targetUser) {
  ensureAdminOrManager(actor);
  if (!actor || isAdmin(actor)) return;
  if (Number(targetUser.company_id) !== Number(actor.company_id)) {
    throw new ApiError(403, 'Gerente só pode administrar usuários da própria empresa.');
  }
  if (profileName(targetUser) === PROFILE_ADMIN) {
    throw new ApiError(403, 'Gerente não pode administrar usuários Admin.');
  }
}

function ensureUserProfileForManager(actor, profile) {
  if (!actor || isAdmin(actor)) return;
  if (!isManager(actor)) throw new ApiError(403, 'Usuário sem permissão para administrar usuários.');
  if (![PROFILE_MANAGER, PROFILE_VIEWER].includes(profile.name)) {
    throw new ApiError(403, 'Gerente pode criar ou alterar apenas usuários Gerente ou Consulta.');
  }
}

module.exports = {
  PROFILE_ADMIN,
  PROFILE_MANAGER,
  PROFILE_VIEWER,
  profileName,
  isAdmin,
  isManager,
  isViewer,
  ensureAdminOrManager,
  ensureAdmin,
  ensureCompanyAccess,
  ensureCompanyExists,
  resolveCompanyIdForWrite,
  companyIdFromConnection,
  companyIdFromDataSource,
  companyIdFromDashboard,
  companyIdFromWidget,
  ensureDataSourcesSameCompany,
  ensureUserManagementTarget,
  ensureUserProfileForManager,
};
