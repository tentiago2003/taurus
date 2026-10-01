const API_BASE = '/api'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options,
  })

  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new Error(payload?.error || `Erro ${response.status} ao comunicar com a API.`)
  }

  return payload
}


export function login(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function fetchCurrentUser() {
  return request('/auth/me')
}

export function updateCurrentUser(data) {
  return request('/auth/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function logout() {
  return request('/auth/logout', { method: 'POST' })
}

export function fetchCompanies() {
  return request('/companies')
}

export function createCompany(data) {
  return request('/companies', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateCompany(id, data) {
  return request(`/companies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deactivateCompany(id) {
  return request(`/companies/${id}/deactivate`, { method: 'POST' })
}

export function reactivateCompany(id) {
  return request(`/companies/${id}/reactivate`, { method: 'POST' })
}

export function deleteCompany(id) {
  return request(`/companies/${id}`, { method: 'DELETE' })
}

export function fetchProfiles() {
  return request('/profiles')
}

export function fetchUsers() {
  return request('/users')
}

export function createUser(data) {
  return request('/users', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateUser(id, data) {
  return request(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deactivateUser(id) {
  return request(`/users/${id}/deactivate`, { method: 'POST' })
}

export function reactivateUser(id) {
  return request(`/users/${id}/reactivate`, { method: 'POST' })
}

export function deleteUser(id) {
  return request(`/users/${id}`, { method: 'DELETE' })
}

export function fetchDataSources() {
  return request('/data-sources')
}

export function fetchConnections() {
  return request('/connections')
}

export function fetchConnection(id) {
  return request(`/connections/${id}`)
}

export function createConnection(data) {
  return request('/connections', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateConnection(id, data) {
  return request(`/connections/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deactivateConnection(id) {
  return request(`/connections/${id}/deactivate`, { method: 'POST' })
}

export function reactivateConnection(id) {
  return request(`/connections/${id}/reactivate`, { method: 'POST' })
}

export function deleteConnection(id) {
  return request(`/connections/${id}`, { method: 'DELETE' })
}

export function reconnectConnection(id) {
  return request(`/connections/${id}/reconnect`, { method: 'POST' })
}

export function fetchConnectionEvents(id, { page = 1, pageSize = 50, eventType = '', from = '', to = '' } = {}) {
  const params = new URLSearchParams()
  params.set('page', page)
  params.set('pageSize', pageSize)
  if (eventType) params.set('eventType', eventType)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  return request(`/connections/${id}/events?${params.toString()}`)
}


export function fetchSystemSettings() {
  return request('/system-settings')
}

export function updateSystemSettings(data) {
  return request('/system-settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function fetchCleanupStatus() {
  return request('/system-settings/cleanup/status')
}

export function fetchCleanupHistory({ limit = 50 } = {}) {
  return request(`/system-settings/cleanup/history?limit=${encodeURIComponent(limit)}`)
}

export function previewManualCleanup(data) {
  return request('/system-settings/cleanup/preview', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function executeManualCleanup(data) {
  return request('/system-settings/cleanup/manual', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}



export function fetchMeasurements({ dataSourceId = null, metric = '', from = '', to = '', page = 1, pageSize = 50 } = {}) {
  const params = new URLSearchParams()
  if (dataSourceId !== null && dataSourceId !== undefined && dataSourceId !== '') params.set('dataSourceId', dataSourceId)
  if (metric) params.set('metric', metric)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  params.set('page', page)
  params.set('pageSize', pageSize)
  return request(`/measurements?${params.toString()}`)
}

export function fetchRawMessages({ dataSourceId = null, topic = '', from = '', to = '', page = 1, pageSize = 50 } = {}) {
  const params = new URLSearchParams()
  if (dataSourceId !== null && dataSourceId !== undefined && dataSourceId !== '') params.set('dataSourceId', dataSourceId)
  if (topic) params.set('topic', topic)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  params.set('page', page)
  params.set('pageSize', pageSize)
  return request(`/raw-messages?${params.toString()}`)
}


export function fetchInterpretation(dataSourceId) {
  return request(`/data-sources/${dataSourceId}/interpretation`)
}

export function updateInterpretation(dataSourceId, interpretation) {
  return request(`/data-sources/${dataSourceId}/interpretation`, {
    method: 'PUT',
    body: JSON.stringify({ interpretation }),
  })
}

export function testInterpretation(dataSourceId, { payload, interpretation }) {
  return request(`/data-sources/${dataSourceId}/interpretation/test`, {
    method: 'POST',
    body: JSON.stringify({ payload, interpretation }),
  })
}


export function fetchDashboards() {
  return request('/dashboards')
}

export function fetchDashboard(id) {
  return request(`/dashboards/${id}`)
}

export function fetchWidgetData(id, { periodDays, page = 1, pageSize = 10 } = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (periodDays !== undefined && periodDays !== null) params.set('periodDays', String(periodDays))
  return request(`/widgets/${id}/data?${params.toString()}`)
}

export function createDashboard(data) {
  return request('/dashboards', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateDashboard(id, data) {
  return request(`/dashboards/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteDashboard(id) {
  return request(`/dashboards/${id}`, { method: 'DELETE' })
}

export function createWidget(data) {
  return request('/widgets', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateWidget(id, data) {
  return request(`/widgets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteWidget(id) {
  return request(`/widgets/${id}`, { method: 'DELETE' })
}

async function downloadXlsx(path) {
  const response = await fetch(`${API_BASE}${path}`, { credentials: 'same-origin' })
  if (!response.ok) {
    let payload = null
    try { payload = await response.json() } catch { payload = null }
    throw new Error(payload?.error || `Erro ${response.status} ao exportar os dados.`)
  }
  return response.blob()
}

function buildExportQuery(params) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') query.set(key, value)
  })
  return query.toString()
}

export function exportMeasurements(params = {}) {
  const query = buildExportQuery(params)
  return downloadXlsx(`/exports/measurements${query ? `?${query}` : ''}`)
}

export function exportRawMessages(params = {}) {
  const query = buildExportQuery(params)
  return downloadXlsx(`/exports/raw-messages${query ? `?${query}` : ''}`)
}
