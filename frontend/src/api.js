const API_BASE = '/api'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
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
