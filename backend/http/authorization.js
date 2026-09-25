const PROFILE_ADMIN = 'Admin';
const PROFILE_MANAGER = 'Gerente';
const PROFILE_VIEWER = 'Consulta';

function profileName(user) {
  if (!user) return null;
  return user.profile_name || null;
}

function isReadRequest(method) {
  return method === 'GET';
}

function isAdminOnly(pathname) {
  return (
    pathname === '/api/system-settings' ||
    pathname.startsWith('/api/profiles') && pathname !== '/api/profiles' ||
    pathname.startsWith('/api/companies')
  );
}

function isManagerWrite(pathname, method) {
  if (isReadRequest(method)) return false;

  if (pathname.startsWith('/api/dashboards') || pathname.startsWith('/api/widgets')) return true;
  if (pathname.startsWith('/api/connections')) return true;
  if (pathname.startsWith('/api/data-sources')) return true;
  if (pathname.startsWith('/api/users')) return true;

  return false;
}

function canAccess(user, method, pathname) {
  const profile = profileName(user);
  if (profile === PROFILE_ADMIN) return true;

  if (profile === PROFILE_VIEWER) {
    if (pathname.startsWith('/api/companies') || pathname.startsWith('/api/profiles') || pathname.startsWith('/api/users')) return false;
    return isReadRequest(method);
  }

  if (profile !== PROFILE_MANAGER) return false;

  if (pathname.startsWith('/api/companies')) return false;
  if (pathname.startsWith('/api/profiles')) return method === 'GET';
  if (isManagerWrite(pathname, method)) return true;

  return isReadRequest(method);
}

function assertAccess(user, method, pathname) {
  if (!canAccess(user, method, pathname)) {
    const error = new Error('Usuário sem permissão para esta operação.');
    error.status = 403;
    throw error;
  }
}

module.exports = {
  PROFILE_ADMIN,
  PROFILE_MANAGER,
  PROFILE_VIEWER,
  canAccess,
  assertAccess,
};
