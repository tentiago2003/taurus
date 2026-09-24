import { useState, useEffect, useRef } from 'react'
import {
  fetchCompanies,
  createCompany,
  updateCompany,
  deactivateCompany,
  reactivateCompany,
  deleteCompany,
  fetchProfiles,
  fetchUsers,
  fetchConnections,
  createConnection,
  updateConnection,
  deactivateConnection,
  reactivateConnection,
  deleteConnection,
  reconnectConnection,
  fetchConnectionEvents,
  createUser,
  updateUser,
  deactivateUser,
  reactivateUser,
  login,
  fetchCurrentUser,
  logout,
  fetchSystemSettings,
  updateSystemSettings,
  fetchRawMessages,
  fetchMeasurements,
  fetchDataSources,
  fetchInterpretation,
  updateInterpretation,
  testInterpretation,
  fetchDashboards,
  fetchDashboard,
  createDashboard,
  updateDashboard,
  deleteDashboard,
  createWidget,
  updateWidget,
  deleteWidget,
} from './api'

const formatBuildTime = (isoString) => {
  try {
    const date = new Date(isoString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  } catch {
    return 'N/A'
  }
}

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [eventConnection, setEventConnection] = useState(null)
  const [events, setEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const result = await login(email.trim(), password)
      onLogin(result.user)
    } catch (err) {
      setError(err.message || 'Não foi possível entrar no Taurus.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="header-brand login-brand">
          <svg className="taurus-symbol" viewBox="0 0 40 40" width="32" height="32">
            <circle cx="20" cy="20" r="18" fill="none" stroke="#d4af37" strokeWidth="2" />
            <path d="M 14 16 Q 20 12 26 16" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" />
            <line x1="14" y1="16" x2="12" y2="10" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" />
            <line x1="26" y1="16" x2="28" y2="10" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" />
            <path d="M 15 20 L 20 28 L 25 20" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h1 className="header-title">Taurus</h1>
        </div>
        <h2>Entrar</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="login-email">E-mail</label>
            <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Senha</label>
            <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </div>
          {error && <div className="test-status error"><p>{error}</p></div>}
          <button className="btn-test" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

function HomePage() {
  return (
    <div className="page-content">
      <h2>Início</h2>
      <div className="empty-state">
        <p>Selecione uma opção no menu para começar.</p>
      </div>
    </div>
  )
}

function CompaniesPage() {
  const [companies, setCompanies] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [eventConnection, setEventConnection] = useState(null)
  const [events, setEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [actionError, setActionError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [busyId, setBusyId] = useState(null)

  const loadCompanies = async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const data = await fetchCompanies()
      setCompanies(data)
    } catch (err) {
      setLoadError(err.message || 'Não foi possível carregar as empresas.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCompanies()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!name.trim()) {
      setFormError('Informe o nome da empresa.')
      return
    }

    setIsSubmitting(true)
    try {
      await createCompany({ name: name.trim() })
      setName('')
      await loadCompanies()
    } catch (err) {
      setFormError(err.message || 'Não foi possível criar a empresa.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const startEditing = (company) => {
    setActionError('')
    setEditingId(company.id)
    setEditingName(company.name)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingName('')
  }

  const handleSaveEdit = async (companyId) => {
    if (!editingName.trim()) {
      setActionError('Informe o nome da empresa.')
      return
    }

    setActionError('')
    setBusyId(companyId)
    try {
      await updateCompany(companyId, { name: editingName.trim() })
      cancelEditing()
      await loadCompanies()
    } catch (err) {
      setActionError(err.message || 'Não foi possível atualizar a empresa.')
    } finally {
      setBusyId(null)
    }
  }

  const handleDeactivate = async (company) => {
    if (!window.confirm(`Desativar a empresa "${company.name}"?`)) {
      return
    }
    setActionError('')
    setBusyId(company.id)
    try {
      await deactivateCompany(company.id)
      await loadCompanies()
    } catch (err) {
      setActionError(err.message || 'Não foi possível desativar a empresa.')
    } finally {
      setBusyId(null)
    }
  }

  const handleReactivate = async (company) => {
    setActionError('')
    setBusyId(company.id)
    try {
      await reactivateCompany(company.id)
      await loadCompanies()
    } catch (err) {
      setActionError(err.message || 'Não foi possível reativar a empresa.')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (company) => {
    if (!window.confirm(`Excluir definitivamente a empresa "${company.name}"? Esta ação não pode ser desfeita.`)) {
      return
    }
    setActionError('')
    setBusyId(company.id)
    try {
      await deleteCompany(company.id)
      await loadCompanies()
    } catch (err) {
      setActionError(err.message || 'Não foi possível excluir a empresa.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="page-content">
      <h2>Empresas</h2>
      <p className="page-description">Cadastre e visualize as empresas do Taurus.</p>

      <div className="connection-form">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="company-name">Nome</label>
            <input
              type="text"
              id="company-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da empresa"
              disabled={isSubmitting}
            />
          </div>

          {formError && (
            <div className="test-status error">
              <p>{formError}</p>
            </div>
          )}

          <button className="btn-test" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Adicionar empresa'}
          </button>
        </form>
      </div>

      {loadError && (
        <div className="test-status error">
          <p>{loadError}</p>
        </div>
      )}

      {actionError && (
        <div className="test-status error">
          <p>{actionError}</p>
        </div>
      )}

      {isLoading ? (
        <div className="empty-state">
          <p>Carregando empresas...</p>
        </div>
      ) : companies.length === 0 ? (
        !loadError && (
          <div className="empty-state">
            <p>Nenhuma empresa cadastrada.</p>
          </div>
        )
      ) : (
        <div className="slaves-container">
          <table className="slaves-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Status</th>
                <th>Criada em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.id}>
                  <td>{company.id}</td>
                  <td>
                    {editingId === company.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        disabled={busyId === company.id}
                      />
                    ) : (
                      company.name
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${company.active ? 'active' : 'inactive'}`}>
                      {company.active ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td>{company.created_at}</td>
                  <td>
                    <div className="table-actions">
                      {editingId === company.id ? (
                        <>
                          <button
                            className="btn-small"
                            onClick={() => handleSaveEdit(company.id)}
                            disabled={busyId === company.id}
                          >
                            Salvar
                          </button>
                          <button
                            className="btn-small"
                            onClick={cancelEditing}
                            disabled={busyId === company.id}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn-small"
                            onClick={() => startEditing(company)}
                            disabled={busyId === company.id}
                          >
                            Editar
                          </button>
                          {company.active ? (
                            <button
                              className="btn-small"
                              onClick={() => handleDeactivate(company)}
                              disabled={busyId === company.id}
                            >
                              Desativar
                            </button>
                          ) : (
                            <button
                              className="btn-small"
                              onClick={() => handleReactivate(company)}
                              disabled={busyId === company.id}
                            >
                              Reativar
                            </button>
                          )}
                          <button
                            className="btn-small danger"
                            onClick={() => handleDelete(company)}
                            disabled={busyId === company.id}
                          >
                            Excluir
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const ADMIN_PROFILE_NAME = 'Admin'

const emptyUserForm = { name: '', email: '', profileId: '', companyId: '', password: '' }

function UsersPage() {
  const [users, setUsers] = useState([])
  const [profiles, setProfiles] = useState([])
  const [companies, setCompanies] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [form, setForm] = useState(emptyUserForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [eventConnection, setEventConnection] = useState(null)
  const [events, setEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [formError, setFormError] = useState('')

  const [actionError, setActionError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(emptyUserForm)
  const [busyId, setBusyId] = useState(null)

  const isAdminProfile = (profileId) =>
    profiles.find((p) => p.id === Number(profileId))?.name === ADMIN_PROFILE_NAME

  const profileName = (profileId) => profiles.find((p) => p.id === profileId)?.name || '—'
  const companyName = (companyId) => companies.find((c) => c.id === companyId)?.name || '—'

  const loadAll = async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const [usersData, profilesData, companiesData] = await Promise.all([
        fetchUsers(),
        fetchProfiles(),
        fetchCompanies(),
      ])
      setUsers(usersData)
      setProfiles(profilesData)
      setCompanies(companiesData)
    } catch (err) {
      setLoadError(err.message || 'Não foi possível carregar os usuários.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!form.name.trim() || !form.email.trim() || !form.profileId || !form.password.trim()) {
      setFormError('Preencha nome, e-mail, perfil e senha.')
      return
    }
    if (!isAdminProfile(form.profileId) && !form.companyId) {
      setFormError('Empresa é obrigatória para este perfil.')
      return
    }

    setIsSubmitting(true)
    try {
      await createUser({
        name: form.name.trim(),
        email: form.email.trim(),
        profileId: Number(form.profileId),
        companyId: form.companyId ? Number(form.companyId) : null,
        password: form.password,
      })
      setForm(emptyUserForm)
      await loadAll()
    } catch (err) {
      setFormError(err.message || 'Não foi possível criar o usuário.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const startEditing = (user) => {
    setActionError('')
    setEditingId(user.id)
    setEditForm({
      name: user.name,
      email: user.email,
      profileId: String(user.profile_id),
      companyId: user.company_id ? String(user.company_id) : '',
      password: '',
    })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditForm(emptyUserForm)
  }

  const handleEditChange = (e) => {
    const { name, value } = e.target
    setEditForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSaveEdit = async (userId) => {
    if (!editForm.name.trim() || !editForm.email.trim() || !editForm.profileId) {
      setActionError('Preencha nome, e-mail e perfil.')
      return
    }
    if (!isAdminProfile(editForm.profileId) && !editForm.companyId) {
      setActionError('Empresa é obrigatória para este perfil.')
      return
    }

    setActionError('')
    setBusyId(userId)
    try {
      const payload = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        profileId: Number(editForm.profileId),
        companyId: editForm.companyId ? Number(editForm.companyId) : null,
      }
      if (editForm.password.trim()) {
        payload.password = editForm.password.trim()
      }
      await updateUser(userId, payload)
      cancelEditing()
      await loadAll()
    } catch (err) {
      setActionError(err.message || 'Não foi possível atualizar o usuário.')
    } finally {
      setBusyId(null)
    }
  }

  const handleDeactivate = async (user) => {
    if (!window.confirm(`Desativar o usuário "${user.name}"?`)) {
      return
    }
    setActionError('')
    setBusyId(user.id)
    try {
      await deactivateUser(user.id)
      await loadAll()
    } catch (err) {
      setActionError(err.message || 'Não foi possível desativar o usuário.')
    } finally {
      setBusyId(null)
    }
  }

  const handleReactivate = async (user) => {
    setActionError('')
    setBusyId(user.id)
    try {
      await reactivateUser(user.id)
      await loadAll()
    } catch (err) {
      setActionError(err.message || 'Não foi possível reativar o usuário.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="page-content">
      <h2>Usuários</h2>
      <p className="page-description">Cadastre e administre os usuários do Taurus.</p>

      <div className="connection-form">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="user-name">Nome</label>
            <input
              type="text"
              id="user-name"
              name="name"
              value={form.name}
              onChange={handleFormChange}
              placeholder="Nome do usuário"
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="user-email">E-mail</label>
            <input
              type="email"
              id="user-email"
              name="email"
              value={form.email}
              onChange={handleFormChange}
              placeholder="usuario@empresa.com"
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="user-profile">Perfil</label>
            <select
              id="user-profile"
              name="profileId"
              value={form.profileId}
              onChange={handleFormChange}
              disabled={isSubmitting}
            >
              <option value="">Selecione...</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="user-company">Empresa</label>
            <select
              id="user-company"
              name="companyId"
              value={form.companyId}
              onChange={handleFormChange}
              disabled={isSubmitting || isAdminProfile(form.profileId)}
            >
              <option value="">
                {isAdminProfile(form.profileId) ? 'Não aplicável' : 'Selecione...'}
              </option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="user-password">Senha</label>
            <input
              type="password"
              id="user-password"
              name="password"
              value={form.password}
              onChange={handleFormChange}
              placeholder="Senha"
              disabled={isSubmitting}
            />
          </div>

          {formError && (
            <div className="test-status error">
              <p>{formError}</p>
            </div>
          )}

          <button className="btn-test" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Adicionar usuário'}
          </button>
        </form>
      </div>

      {loadError && (
        <div className="test-status error">
          <p>{loadError}</p>
        </div>
      )}

      {actionError && (
        <div className="test-status error">
          <p>{actionError}</p>
        </div>
      )}

      {isLoading ? (
        <div className="empty-state">
          <p>Carregando usuários...</p>
        </div>
      ) : users.length === 0 ? (
        !loadError && (
          <div className="empty-state">
            <p>Nenhum usuário cadastrado.</p>
          </div>
        )
      ) : (
        <div className="slaves-container">
          <table className="slaves-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Perfil</th>
                <th>Empresa</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  {editingId === user.id ? (
                    <>
                      <td>
                        <input
                          type="text"
                          name="name"
                          value={editForm.name}
                          onChange={handleEditChange}
                          disabled={busyId === user.id}
                        />
                      </td>
                      <td>
                        <input
                          type="email"
                          name="email"
                          value={editForm.email}
                          onChange={handleEditChange}
                          disabled={busyId === user.id}
                        />
                      </td>
                      <td>
                        <select
                          name="profileId"
                          value={editForm.profileId}
                          onChange={handleEditChange}
                          disabled={busyId === user.id}
                        >
                          {profiles.map((profile) => (
                            <option key={profile.id} value={profile.id}>
                              {profile.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          name="companyId"
                          value={editForm.companyId}
                          onChange={handleEditChange}
                          disabled={busyId === user.id || isAdminProfile(editForm.profileId)}
                        >
                          <option value="">
                            {isAdminProfile(editForm.profileId) ? 'Não aplicável' : 'Selecione...'}
                          </option>
                          {companies.map((company) => (
                            <option key={company.id} value={company.id}>
                              {company.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <span className={`status-badge ${user.active ? 'active' : 'inactive'}`}>
                          {user.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <input
                            type="password"
                            name="password"
                            value={editForm.password}
                            onChange={handleEditChange}
                            placeholder="Nova senha (opcional)"
                            disabled={busyId === user.id}
                          />
                          <button
                            className="btn-small"
                            onClick={() => handleSaveEdit(user.id)}
                            disabled={busyId === user.id}
                          >
                            Salvar
                          </button>
                          <button
                            className="btn-small"
                            onClick={cancelEditing}
                            disabled={busyId === user.id}
                          >
                            Cancelar
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{profileName(user.profile_id)}</td>
                      <td>{companyName(user.company_id)}</td>
                      <td>
                        <span className={`status-badge ${user.active ? 'active' : 'inactive'}`}>
                          {user.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="btn-small"
                            onClick={() => startEditing(user)}
                            disabled={busyId === user.id}
                          >
                            Editar
                          </button>
                          {user.active ? (
                            <button
                              className="btn-small"
                              onClick={() => handleDeactivate(user)}
                              disabled={busyId === user.id}
                            >
                              Desativar
                            </button>
                          ) : (
                            <button
                              className="btn-small"
                              onClick={() => handleReactivate(user)}
                              disabled={busyId === user.id}
                            >
                              Reativar
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function formatLocalDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('pt-BR')
}

function runtimeLabel(status) {
  const labels = {
    inactive: 'Inativa',
    connecting: 'Conectando',
    connected: 'Conectada',
    reconnecting: 'Reconectando',
    disconnected: 'Desconectada',
    error: 'Falha',
  }
  return labels[status] || status || 'Desconectada'
}

function ConnectionPage({ isTestActive, onStartTest, runtimeStatuses }) {
  const [defaultSamplingIntervalSeconds, setDefaultSamplingIntervalSeconds] = useState(null)
  const emptyTopic = () => ({ id: null, name: '', topic: '', samplingIntervalSeconds: defaultSamplingIntervalSeconds ?? '', storeHistory: true, active: true })
  const emptyForm = () => ({ id: null, companyId: '', name: '', type: 'MQTT', host: '', port: '', username: '', password: '', topics: [emptyTopic()] })
  const [connections, setConnections] = useState([])
  const [companies, setCompanies] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [eventConnection, setEventConnection] = useState(null)
  const [events, setEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventPage, setEventPage] = useState(1)
  const [eventPageSize, setEventPageSize] = useState(50)
  const [eventPagination, setEventPagination] = useState({ total: 0, totalPages: 1 })
  const [eventType, setEventType] = useState('')
  const [eventFromDate, setEventFromDate] = useState('')
  const [eventToDate, setEventToDate] = useState('')

  const loadAll = async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const [connectionData, companyData, systemSettings] = await Promise.all([fetchConnections(), fetchCompanies(), fetchSystemSettings()])
      setConnections(connectionData)
      setCompanies(companyData)
      setDefaultSamplingIntervalSeconds(systemSettings.default_sampling_interval_seconds)
    } catch (err) {
      setLoadError(err.message || 'Não foi possível carregar as conexões.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const openNew = () => {
    setActionError('')
    setForm(emptyForm())
    setEditing(true)
  }

  const openEdit = (connection) => {
    const configuration = connection.configuration || {}
    setActionError('')
    setForm({
      id: connection.id,
      companyId: String(connection.company_id),
      name: connection.name,
      type: connection.type,
      host: configuration.host || '',
      port: configuration.port ? String(configuration.port) : '',
      username: configuration.username || '',
      password: configuration.password || '',
      topics: (connection.dataSources || []).map((source) => ({
        id: source.id,
        name: source.name,
        topic: source.topic || '',
        samplingIntervalSeconds: source.sampling_interval_seconds ?? defaultSamplingIntervalSeconds ?? '',
        storeHistory: Boolean(source.store_history),
        active: Boolean(source.active),
      })),
    })
    setEditing(true)
  }

  const closeEditor = () => {
    if (isSubmitting) return
    setActionError('')
    setEditing(false)
    setForm(emptyForm())
  }

  const updateForm = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const updateTopic = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      topics: prev.topics.map((topic, i) => i === index ? { ...topic, [field]: value } : topic),
    }))
  }

  const addTopic = () => setForm((prev) => ({ ...prev, topics: [...prev.topics, emptyTopic()] }))
  const removeTopic = (index) => setForm((prev) => ({ ...prev, topics: prev.topics.filter((_, i) => i !== index) }))

  const handleTest = () => {
    const topics = form.topics.map((item) => item.topic.trim()).filter(Boolean)
    if (!form.host.trim() || !form.port || topics.length === 0) {
      setActionError('Informe host, porta e pelo menos um tópico MQTT antes de testar a conexão.')
      return
    }
    setActionError('')
    onStartTest({
      host: form.host.trim(),
      port: form.port,
      username: form.username.trim(),
      password: form.password,
      topics,
    })
  }

  const handleSave = async () => {
    if (!form.companyId || !form.name.trim() || !form.host.trim() || !form.port) {
      setActionError('Preencha empresa, nome, host e porta.')
      return
    }
    if (form.topics.length === 0) {
      setActionError('Informe pelo menos um tópico MQTT.')
      return
    }
    if (form.topics.some((topic) => !topic.name.trim() || !topic.topic.trim())) {
      setActionError('Preencha o nome e o tópico de todas as fontes.')
      return
    }

    setActionError('')
    setIsSubmitting(true)
    try {
      const payload = {
        companyId: Number(form.companyId),
        name: form.name.trim(),
        type: form.type,
        configuration: {
          host: form.host.trim(),
          port: Number(form.port),
          username: form.username.trim(),
          password: form.password,
        },
        topics: form.topics.map((topic) => ({
          id: topic.id,
          name: topic.name.trim(),
          topic: topic.topic.trim(),
          samplingIntervalSeconds: Number(topic.samplingIntervalSeconds),
          storeHistory: Boolean(topic.storeHistory),
          active: Boolean(topic.active),
        })),
      }
      if (form.id) await updateConnection(form.id, payload)
      else await createConnection(payload)
      setEditing(false)
      setForm(emptyForm())
      await loadAll()
    } catch (err) {
      setActionError(err.message || 'Não foi possível salvar a conexão.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeactivate = async (connection) => {
    if (!window.confirm(`Desativar a conexão "${connection.name}"?`)) return
    try {
      await deactivateConnection(connection.id)
      await loadAll()
    } catch (err) { setActionError(err.message || 'Não foi possível desativar a conexão.') }
  }

  const handleReactivate = async (connection) => {
    try {
      await reactivateConnection(connection.id)
      await loadAll()
    } catch (err) { setActionError(err.message || 'Não foi possível reativar a conexão.') }
  }

  const handleReconnect = async (connection) => {
    try {
      await reconnectConnection(connection.id)
      await loadAll()
    } catch (err) { setActionError(err.message || 'Não foi possível reconectar a conexão.') }
  }

  const toStartOfDayIso = (value) => value ? new Date(`${value}T00:00:00`).toISOString() : ''
  const toEndOfDayIso = (value) => value ? new Date(`${value}T23:59:59.999`).toISOString() : ''

  const loadEvents = async ({ requestedPage = eventPage, silent = false, eventTypeOverride = eventType, fromDateOverride = eventFromDate, toDateOverride = eventToDate } = {}) => {
    if (!eventConnection) return
    if (!silent) setEventsLoading(true)
    try {
      const result = await fetchConnectionEvents(eventConnection.id, {
        page: requestedPage,
        pageSize: eventPageSize,
        eventType: eventTypeOverride,
        from: toStartOfDayIso(fromDateOverride),
        to: toEndOfDayIso(toDateOverride),
      })
      setEvents(result.rows || [])
      setEventPagination(result)
      setEventPage(result.page || requestedPage)
    } catch (err) {
      setActionError(err.message || 'Não foi possível carregar o log da conexão.')
    } finally {
      if (!silent) setEventsLoading(false)
    }
  }

  const handleShowEvents = (connection) => {
    setEventConnection(connection)
    setEvents([])
    setEventPage(1)
    setEventPageSize(50)
    setEventPagination({ total: 0, totalPages: 1 })
    setEventType('')
    setEventFromDate('')
    setEventToDate('')
  }

  useEffect(() => {
    if (eventConnection) loadEvents()
  }, [eventConnection, eventPage, eventPageSize])

  const handleDelete = async (connection) => {
    if (!window.confirm(`Excluir definitivamente a conexão "${connection.name}"?`)) return
    try {
      await deleteConnection(connection.id)
      await loadAll()
    } catch (err) { setActionError(err.message || 'Não foi possível excluir a conexão.') }
  }

  if (editing) {
    return (
      <div className="page-content connection-editor-page">
        <div className="connection-editor-header">
          <div>
            <button className="btn-small connection-back-button" onClick={closeEditor} disabled={isSubmitting}>← Voltar para conexões</button>
            <h2>{form.id ? 'Editar conexão' : 'Nova conexão'}</h2>
            <p className="page-description">Configure a conexão MQTT e suas fontes de dados.</p>
          </div>
        </div>

        {actionError && <div className="test-status error"><p>{actionError}</p></div>}

        <section className="connection-section">
          <div className="connection-section-title"><span>1</span><div><h3>Dados da conexão</h3><p>Parâmetros utilizados para conectar ao broker MQTT.</p></div></div>
          <div className="connection-grid">
            <div className="form-group"><label>Empresa</label><select value={form.companyId} onChange={(e) => updateForm('companyId', e.target.value)} disabled={isSubmitting}><option value="">Selecione...</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></div>
            <div className="form-group"><label>Tipo</label><select value={form.type} disabled><option value="MQTT">MQTT</option></select></div>
            <div className="form-group"><label>Nome da conexão</label><input value={form.name} onChange={(e) => updateForm('name', e.target.value)} disabled={isSubmitting} placeholder="Ex.: MQTT Produção" /></div>
            <div className="form-group"><label>Host</label><input value={form.host} onChange={(e) => updateForm('host', e.target.value)} disabled={isSubmitting} /></div>
            <div className="form-group"><label>Porta</label><input type="number" value={form.port} onChange={(e) => updateForm('port', e.target.value)} disabled={isSubmitting} /></div>
            <div className="form-group"><label>Usuário</label><input value={form.username} onChange={(e) => updateForm('username', e.target.value)} disabled={isSubmitting} /></div>
            <div className="form-group"><label>Senha</label><input type="password" value={form.password} onChange={(e) => updateForm('password', e.target.value)} disabled={isSubmitting} /></div>
          </div>
        </section>

        <section className="connection-section">
          <div className="connection-section-head"><div className="connection-section-title"><span>2</span><div><h3>Tópicos MQTT</h3><p>Os tópicos fazem parte da configuração e do teste da conexão.</p></div></div><button className="btn-add-topic" onClick={addTopic} disabled={isSubmitting}>+ Adicionar tópico</button></div>
          <div className="topics-edit-list">{form.topics.map((topic, index) => <div className="topic-edit-card" key={topic.id || `new-${index}`}>
            <div className="topic-edit-grid"><div className="form-group"><label>Nome da fonte</label><input value={topic.name} onChange={(e) => updateTopic(index, 'name', e.target.value)} /></div><div className="form-group"><label>Tópico MQTT</label><input value={topic.topic} onChange={(e) => updateTopic(index, 'topic', e.target.value)} /></div><div className="form-group"><label>Intervalo (s)</label><input type="number" min="1" value={topic.samplingIntervalSeconds} onChange={(e) => updateTopic(index, 'samplingIntervalSeconds', e.target.value)} /></div><div className="form-group"><label>Histórico</label><select value={topic.storeHistory ? '1' : '0'} onChange={(e) => updateTopic(index, 'storeHistory', e.target.value === '1')}><option value="1">Sim</option><option value="0">Não</option></select></div></div>
            <button className="btn-remove-topic" onClick={() => removeTopic(index)} disabled={isSubmitting} aria-label="Remover tópico">−</button>
          </div>)}</div>
        </section>

        <section className="connection-section">
          <div className="connection-section-head"><div className="connection-section-title"><span>3</span><div><h3>Teste da conexão</h3><p>O teste utiliza os dados da conexão e os tópicos cadastrados.</p></div></div><button className="btn-test" onClick={handleTest} disabled={isTestActive || isSubmitting}>{isTestActive ? 'Teste em andamento...' : 'Testar conexão'}</button></div>
        </section>

        <div className="connection-modal-note"><strong>O teste é temporário.</strong> Ele conecta ao broker, assina os tópicos e aguarda dados. Ele não salva nem ativa a conexão permanente.</div>
        <div className="connection-editor-footer"><button className="btn-small" onClick={closeEditor} disabled={isSubmitting}>Cancelar</button><button className="btn-test" onClick={handleSave} disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : 'Salvar conexão'}</button></div>
      </div>
    )
  }

  return (
    <>
      <div className="page-content connections-page">

      <div className="connections-header">
        <div><h2>Conexões</h2><p className="page-description">Gerencie as conexões externas utilizadas pelo Taurus.</p></div>
        <button className="btn-test" onClick={openNew}>+ Nova conexão</button>
      </div>

      {(loadError || actionError) && <div className="test-status error"><p>{loadError || actionError}</p></div>}

      {isLoading ? <div className="empty-state"><p>Carregando conexões...</p></div> : connections.length === 0 ? (
        !loadError && <div className="empty-state"><p>Nenhuma conexão cadastrada.</p></div>
      ) : (
        <div className="slaves-container connections-table-container">
          <table className="slaves-table connections-table"><thead><tr><th>Nome</th><th>Empresa</th><th>Tipo</th><th>Status</th><th>Tópicos</th><th>Ações</th></tr></thead>
          <tbody>{connections.map((connection) => <tr key={connection.id}>
            <td>{connection.name}</td><td>{companies.find((c) => c.id === connection.company_id)?.name || connection.company_id}</td><td>{connection.type}</td>
            <td><span className={`status-badge runtime-${(runtimeStatuses?.[connection.id]?.status || connection.runtime?.status || (connection.active ? 'disconnected' : 'inactive'))}`}>{runtimeLabel(runtimeStatuses?.[connection.id]?.status || connection.runtime?.status || (connection.active ? 'disconnected' : 'inactive'))}</span></td>
            <td>{connection.dataSources?.length || 0}</td>
            <td><div className="table-actions">
              <button className="btn-small" onClick={() => openEdit(connection)}>Editar</button>
              {connection.active ? <>
                <button className="btn-small" onClick={() => handleDeactivate(connection)}>Desativar</button>
                {['disconnected', 'error'].includes(runtimeStatuses?.[connection.id]?.status || connection.runtime?.status) && <button className="btn-small" onClick={() => handleReconnect(connection)}>Reconectar</button>}
              </> : <button className="btn-small" onClick={() => handleReactivate(connection)}>Ativar</button>}
              <button className="btn-small" onClick={() => handleShowEvents(connection)}>Log</button>
              <button className="btn-small danger" onClick={() => handleDelete(connection)}>Excluir</button>
            </div></td>
          </tr>)}</tbody></table>
        </div>
      )}
      </div>
      {eventConnection && (
        <div className="connection-events-backdrop">
          <section className="connection-events-modal" role="dialog" aria-modal="true">
            <div className="connection-events-header">
              <div><h2>Log da conexão</h2><p>{eventConnection.name}</p></div>
              <button className="btn-small" onClick={() => setEventConnection(null)}>Fechar</button>
            </div>
            <form className="connection-events-filters" onSubmit={(event) => { event.preventDefault(); setEventPage(1); loadEvents({ requestedPage: 1 }) }}>
              <div className="form-group">
                <label htmlFor="connection-event-type">Tipo de evento</label>
                <select id="connection-event-type" value={eventType} onChange={(event) => setEventType(event.target.value)}>
                  <option value="">Todos os eventos</option>
                  {['CONNECTING', 'CONNECTED', 'RECONNECTING', 'OFFLINE', 'DISCONNECTED', 'CONNECTION_ERROR', 'RAW_MESSAGE_ERROR', 'BACKEND_SHUTDOWN'].map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="connection-event-from">De</label>
                <input id="connection-event-from" type="date" value={eventFromDate} onChange={(event) => setEventFromDate(event.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="connection-event-to">Até</label>
                <input id="connection-event-to" type="date" value={eventToDate} onChange={(event) => setEventToDate(event.target.value)} />
              </div>
              <div className="connection-events-filter-actions">
                <button className="btn-test" type="submit">Filtrar</button>
                <button className="btn-small" type="button" onClick={() => { setEventType(''); setEventFromDate(''); setEventToDate(''); setEventPage(1); loadEvents({ requestedPage: 1, eventTypeOverride: '', fromDateOverride: '', toDateOverride: '' }) }}>Limpar</button>
              </div>
            </form>
            <div className="connection-events-summary">
              <span><strong>{eventPagination.total || 0}</strong> evento(s) encontrado(s)</span>
              <span>Horário exibido no fuso local do navegador</span>
            </div>
            {eventsLoading ? <div className="empty-state"><p>Carregando eventos...</p></div> : events.length === 0 ? <div className="empty-state"><p>Nenhum evento registrado para os filtros selecionados.</p></div> : (
              <>
                <div className="connection-events-list">
                  {events.map((event) => (
                    <div className="connection-event-row" key={event.id}>
                      <span className="connection-event-time">{formatLocalDateTime(event.timestamp)}</span>
                      <span className={`connection-event-type event-${event.event_type.toLowerCase()}`}>{event.event_type}</span>
                      <span className="connection-event-message">{event.message || ''}</span>
                    </div>
                  ))}
                </div>
                <div className="connection-events-pagination">
                  <button className="btn-small" type="button" disabled={eventPage <= 1 || eventsLoading} onClick={() => setEventPage((current) => current - 1)}>Anterior</button>
                  <span>Página {eventPage} de {eventPagination.totalPages || 1}</span>
                  <button className="btn-small" type="button" disabled={eventPage >= (eventPagination.totalPages || 1) || eventsLoading} onClick={() => setEventPage((current) => current + 1)}>Próxima</button>
                  <label>Por página <select value={eventPageSize} onChange={(event) => { setEventPageSize(Number(event.target.value)); setEventPage(1) }}><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </>
  )
}


function MqttTestModal({ session, onClose }) {
  const logRef = useRef(null)

  useEffect(() => {
    if (session.status === 'connected' && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [session.status, session.messages?.length])

  const statusContent = {
    connecting: ['Testando conexão...', 'Conectando ao broker MQTT...'],
    connected: ['Conectado', 'Recebendo dados...'],
    error: ['Falha na conexão', session.message || 'Não foi possível conectar ao broker MQTT.'],
  }
  const [title, description] = statusContent[session.status] || statusContent.connecting
  const slaves = Object.entries(session.slaves)

  return (
    <div className="mqtt-test-backdrop" role="presentation">
      <section className="mqtt-test-modal" role="dialog" aria-modal="true" aria-labelledby="mqtt-test-title">
        <h2 id="mqtt-test-title">{title}</h2>
        <p className={`mqtt-test-description ${session.status}`}>{description}</p>

        {session.status === 'connected' && (
          <>
            <div className="mqtt-test-summary">
              <strong>Conexão estabelecida.</strong> Os tópicos foram assinados. Aguardando e exibindo as mensagens recebidas.
            </div>
            <div className="mqtt-test-live">
              <div className="mqtt-test-live-title">Mensagens recebidas</div>
              <div className="mqtt-test-live-log" ref={logRef}>
                {session.messages?.length === 0 ? (
                  <div className="mqtt-test-live-empty">Conectado. Aguardando mensagens MQTT...</div>
                ) : session.messages.map((data, index) => (
                  <div className="mqtt-test-live-line" key={`${data.ts}-${index}`}>
                    <span className="mqtt-test-live-time">{data.ts}</span>{' '}
                    <span className="mqtt-test-live-topic">{data.topic}</span>{' '}
                    <span>→ Slave {data.slave} | T1: {data.t1} | T2: {data.t2}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mqtt-test-current">
              <strong>Último valor por Slave</strong>
              <div className="slaves-container">
                <table className="slaves-table">
                  <thead><tr><th>Slave</th><th>T1</th><th>T2</th><th>Última atualização</th></tr></thead>
                  <tbody>{slaves.map(([slave, data]) => (
                    <tr key={slave}><td>{slave}</td><td className="value">{data.t1}</td><td className="value">{data.t2}</td><td>{data.ts}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <button className="btn-close-test" onClick={onClose}>Fechar teste</button>
      </section>
    </div>
  )
}

function SystemSettingsPage() {
  const [settings, setSettings] = useState(null)
  const [retentionDays, setRetentionDays] = useState('')
  const [samplingMinutes, setSamplingMinutes] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadSettings = async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await fetchSystemSettings()
      setSettings(data)
      setRetentionDays(String(data.measurement_retention_days))
      setSamplingMinutes(String(Math.round(data.default_sampling_interval_seconds / 60)))
    } catch (err) {
      setError(err.message || 'Não foi possível carregar os parâmetros do sistema.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    const retention = Number(retentionDays)
    const sampling = Number(samplingMinutes)
    if (!Number.isInteger(retention) || retention <= 0) {
      setError('A retenção deve ser um número inteiro maior que zero.')
      return
    }
    if (!Number.isInteger(sampling) || sampling <= 0) {
      setError('O intervalo padrão deve ser um número inteiro de minutos maior que zero.')
      return
    }

    setIsSubmitting(true)
    try {
      const updated = await updateSystemSettings({
        measurementRetentionDays: retention,
        defaultSamplingIntervalSeconds: sampling * 60,
      })
      setSettings(updated)
      setRetentionDays(String(updated.measurement_retention_days))
      setSamplingMinutes(String(Math.round(updated.default_sampling_interval_seconds / 60)))
      setSuccess('Parâmetros salvos com sucesso.')
    } catch (err) {
      setError(err.message || 'Não foi possível salvar os parâmetros do sistema.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="page-content">
        <h2>Parâmetros do Sistema</h2>
        <div className="empty-state"><p>Carregando...</p></div>
      </div>
    )
  }

  return (
    <div className="page-content system-settings-page">
      <h2>Parâmetros do Sistema</h2>
      <p className="page-description">Configurações globais utilizadas pelo Taurus.</p>

      <form className="system-settings-card" onSubmit={handleSubmit}>
        <div className="settings-field">
          <label htmlFor="measurement-retention">Retenção das medições</label>
          <div className="settings-input-row">
            <input
              id="measurement-retention"
              type="number"
              min="1"
              step="1"
              value={retentionDays}
              onChange={(e) => setRetentionDays(e.target.value)}
              disabled={isSubmitting}
            />
            <span>dias</span>
          </div>
          <small>Tempo que o histórico de medições deverá permanecer armazenado.</small>
        </div>

        <div className="settings-field">
          <label htmlFor="default-sampling">Intervalo padrão de medição</label>
          <div className="settings-input-row">
            <input
              id="default-sampling"
              type="number"
              min="1"
              step="1"
              value={samplingMinutes}
              onChange={(e) => setSamplingMinutes(e.target.value)}
              disabled={isSubmitting}
            />
            <span>minutos</span>
          </div>
          <small>Valor padrão usado ao criar novas fontes de dados. Cada fonte poderá ter seu próprio intervalo.</small>
        </div>

        {error && <div className="test-status error"><p>{error}</p></div>}
        {success && <div className="test-status success"><p>{success}</p></div>}

        <button className="btn-test settings-save-button" type="submit" disabled={isSubmitting || !settings}>
          {isSubmitting ? 'Salvando...' : 'Salvar parâmetros'}
        </button>
      </form>
    </div>
  )
}

function RawMessagesPage() {
  const [messages, setMessages] = useState([])
  const [dataSources, setDataSources] = useState([])
  const [selectedDataSource, setSelectedDataSource] = useState('')
  const [topic, setTopic] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 })
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [lastRefresh, setLastRefresh] = useState(null)

  const toStartOfDayIso = (value) => value ? new Date(`${value}T00:00:00`).toISOString() : ''
  const toEndOfDayIso = (value) => value ? new Date(`${value}T23:59:59.999`).toISOString() : ''

  const loadMessages = async ({ silent = false, requestedPage = page } = {}) => {
    if (!silent) setIsLoading(true)
    setLoadError('')
    try {
      const result = await fetchRawMessages({
        dataSourceId: selectedDataSource || null,
        topic: topic.trim(),
        from: toStartOfDayIso(fromDate),
        to: toEndOfDayIso(toDate),
        page: requestedPage,
        pageSize,
      })
      setMessages(result.rows || [])
      setPagination(result)
      setLastRefresh(new Date())
    } catch (err) {
      setLoadError(err.message || 'Não foi possível carregar as mensagens brutas.')
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDataSources()
      .then(setDataSources)
      .catch((err) => setLoadError(err.message || 'Não foi possível carregar as fontes de dados.'))
  }, [])

  useEffect(() => {
    setPage(1)
  }, [selectedDataSource, topic, fromDate, toDate, pageSize])

  useEffect(() => {
    loadMessages()
    const timer = setInterval(() => loadMessages({ silent: true }), 5000)
    return () => clearInterval(timer)
  }, [selectedDataSource, topic, fromDate, toDate, page, pageSize])

  const formatDateTime = (value) => {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString('pt-BR')
  }

  const formatPayload = (message) => {
    if (message.payload_text === null) return `[binário] ${message.payload_base64}`
    try { return JSON.stringify(JSON.parse(message.payload_text), null, 2) }
    catch { return message.payload_text }
  }

  const applyFilters = (event) => {
    event.preventDefault()
    setPage(1)
    loadMessages({ requestedPage: 1 })
  }

  const clearFilters = () => {
    setSelectedDataSource('')
    setTopic('')
    setFromDate('')
    setToDate('')
    setPage(1)
  }

  return (
    <div className="page-content raw-messages-page">
      <div className="raw-messages-header">
        <div>
          <h2>Mensagens Brutas</h2>
          <p className="page-description">Visualize as mensagens preservadas exatamente como chegaram das fontes de dados.</p>
        </div>
        <button className="btn-small" onClick={() => loadMessages()} disabled={isLoading}>
          {isLoading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      <form className="raw-messages-toolbar" onSubmit={applyFilters}>
        <div className="raw-messages-filters">
          <div className="form-group">
            <label htmlFor="raw-message-source">Fonte de dados</label>
            <select id="raw-message-source" value={selectedDataSource} onChange={(event) => setSelectedDataSource(event.target.value)}>
              <option value="">Todas as fontes</option>
              {dataSources.map((source) => <option key={source.id} value={source.id}>{source.name}{source.topic ? ` — ${source.topic}` : ''}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="raw-message-topic">Tópico contém</label>
            <input id="raw-message-topic" value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Ex.: P2P-IoT/G001" />
          </div>
          <div className="form-group">
            <label htmlFor="raw-message-from">De</label>
            <input id="raw-message-from" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="raw-message-to">Até</label>
            <input id="raw-message-to" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </div>
          <div className="raw-messages-filter-actions">
            <button className="btn-test" type="submit">Filtrar</button>
            <button className="btn-small" type="button" onClick={clearFilters}>Limpar</button>
          </div>
        </div>
        <div className="raw-messages-summary">
          <strong>{pagination.total || 0}</strong> mensagem(ns) encontrada(s)
          {lastRefresh && <span>Atualizado às {lastRefresh.toLocaleTimeString('pt-BR')}</span>}
        </div>
      </form>

      {loadError && <div className="test-status error"><p>{loadError}</p></div>}
      {isLoading && messages.length === 0 ? <div className="empty-state"><p>Carregando mensagens...</p></div> : messages.length === 0 ? <div className="empty-state"><p>Nenhuma mensagem bruta foi registrada para os filtros selecionados.</p></div> : (
        <>
          <div className="raw-messages-list">
            {messages.map((message) => (
              <details className="raw-message-card" key={message.id}>
                <summary>
                  <span className="raw-message-time">{formatDateTime(message.received_at)}</span>
                  <span className="raw-message-source">{message.data_source_name}</span>
                  <span className="raw-message-topic">{message.topic}</span>
                  <span className="raw-message-size">{message.payload_size_bytes} B</span>
                </summary>
                <div className="raw-message-details">
                  <div className="raw-message-meta">
                    <span><strong>Conexão:</strong> {message.connection_name}</span>
                    <span><strong>Fonte:</strong> {message.data_source_name}</span>
                    <span><strong>Tópico:</strong> {message.topic}</span>
                    <span><strong>Recebida:</strong> {formatDateTime(message.received_at)}</span>
                    <span><strong>Tamanho:</strong> {message.payload_size_bytes} bytes</span>
                  </div>
                  <div className="raw-message-payload"><div className="raw-message-payload-title">Payload</div><pre>{formatPayload(message)}</pre></div>
                </div>
              </details>
            ))}
          </div>
          <div className="raw-messages-pagination">
            <button className="btn-small" type="button" disabled={page <= 1 || isLoading} onClick={() => setPage((current) => current - 1)}>Anterior</button>
            <span>Página {page} de {pagination.totalPages || 1}</span>
            <button className="btn-small" type="button" disabled={page >= (pagination.totalPages || 1) || isLoading} onClick={() => setPage((current) => current + 1)}>Próxima</button>
            <label>Por página <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label>
          </div>
        </>
      )}
    </div>
  )
}



function MeasurementsPage() {
  const [measurements, setMeasurements] = useState([])
  const [dataSources, setDataSources] = useState([])
  const [selectedDataSource, setSelectedDataSource] = useState('')
  const [metric, setMetric] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 })
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [lastRefresh, setLastRefresh] = useState(null)

  const toStartOfDayIso = (value) => value ? new Date(`${value}T00:00:00`).toISOString() : ''
  const toEndOfDayIso = (value) => value ? new Date(`${value}T23:59:59.999`).toISOString() : ''

  const loadMeasurements = async ({ silent = false, requestedPage = page } = {}) => {
    if (!silent) setIsLoading(true)
    setLoadError('')
    try {
      const result = await fetchMeasurements({
        dataSourceId: selectedDataSource || null,
        metric: metric.trim(),
        from: toStartOfDayIso(fromDate),
        to: toEndOfDayIso(toDate),
        page: requestedPage,
        pageSize,
      })
      setMeasurements(result.rows || [])
      setPagination(result)
      setLastRefresh(new Date())
    } catch (err) {
      setLoadError(err.message || 'Não foi possível carregar as medições.')
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDataSources()
      .then(setDataSources)
      .catch((err) => setLoadError(err.message || 'Não foi possível carregar as fontes de dados.'))
  }, [])

  useEffect(() => {
    setPage(1)
  }, [selectedDataSource, metric, fromDate, toDate, pageSize])

  useEffect(() => {
    loadMeasurements()
    const timer = setInterval(() => loadMeasurements({ silent: true }), 5000)
    return () => clearInterval(timer)
  }, [selectedDataSource, metric, fromDate, toDate, page, pageSize])

  const formatDateTime = (value) => {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString('pt-BR')
  }

  const applyFilters = (event) => {
    event.preventDefault()
    setPage(1)
    loadMeasurements({ requestedPage: 1 })
  }

  const clearFilters = () => {
    setSelectedDataSource('')
    setMetric('')
    setFromDate('')
    setToDate('')
    setPage(1)
  }

  return (
    <div className="page-content raw-messages-page">
      <div className="raw-messages-header">
        <div>
          <h2>Medições</h2>
          <p className="page-description">Visualize as medições efetivamente gravadas após a interpretação e o sampling.</p>
        </div>
        <button className="btn-small" onClick={() => loadMeasurements()} disabled={isLoading}>
          {isLoading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      <form className="raw-messages-toolbar" onSubmit={applyFilters}>
        <div className="raw-messages-filters">
          <div className="form-group">
            <label htmlFor="measurement-source">Fonte de dados</label>
            <select id="measurement-source" value={selectedDataSource} onChange={(event) => setSelectedDataSource(event.target.value)}>
              <option value="">Todas as fontes</option>
              {dataSources.map((source) => <option key={source.id} value={source.id}>{source.name}{source.topic ? ` — ${source.topic}` : ''}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="measurement-metric">Métrica</label>
            <input id="measurement-metric" value={metric} onChange={(event) => setMetric(event.target.value)} placeholder="Ex.: temperature_1" />
          </div>
          <div className="form-group">
            <label htmlFor="measurement-from">De</label>
            <input id="measurement-from" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="measurement-to">Até</label>
            <input id="measurement-to" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </div>
          <div className="raw-messages-filter-actions">
            <button className="btn-test" type="submit">Filtrar</button>
            <button className="btn-small" type="button" onClick={clearFilters}>Limpar</button>
          </div>
        </div>
        <div className="raw-messages-summary">
          <strong>{pagination.total || 0}</strong> medição(ões) encontrada(s)
          {lastRefresh && <span>Atualizado às {lastRefresh.toLocaleTimeString('pt-BR')}</span>}
        </div>
      </form>

      {loadError && <div className="test-status error"><p>{loadError}</p></div>}
      {isLoading && measurements.length === 0 ? (
        <div className="empty-state"><p>Carregando medições...</p></div>
      ) : measurements.length === 0 ? (
        <div className="empty-state"><p>Nenhuma medição foi gravada para os filtros selecionados.</p></div>
      ) : (
        <>
          <div className="raw-messages-list">
            <div className="table-wrapper">
              <table className="slaves-table">
                <thead>
                  <tr>
                    <th>Data/Hora</th>
                    <th>Fonte de dados</th>
                    <th>Métrica</th>
                    <th>Valor</th>
                    <th>Payload</th>
                  </tr>
                </thead>
                <tbody>
                  {measurements.map((item) => (
                    <tr key={item.id}>
                      <td>{formatDateTime(item.timestamp)}</td>
                      <td>{item.data_source_name}</td>
                      <td>{item.metric}</td>
                      <td>{item.value}</td>
                      <td>{item.payload ? JSON.stringify(item.payload) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="raw-messages-pagination">
            <button className="btn-small" type="button" disabled={page <= 1 || isLoading} onClick={() => setPage((current) => current - 1)}>Anterior</button>
            <span>Página {page} de {pagination.totalPages || 1}</span>
            <button className="btn-small" type="button" disabled={page >= (pagination.totalPages || 1) || isLoading} onClick={() => setPage((current) => current + 1)}>Próxima</button>
            <label>Por página <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label>
          </div>
        </>
      )}
    </div>
  )
}

function InterpretationPage({ currentUser }) {
  const [companies, setCompanies] = useState([])
  const [connections, setConnections] = useState([])
  const [dataSources, setDataSources] = useState([])
  const [selectedCompany, setSelectedCompany] = useState('')
  const [selectedConnection, setSelectedConnection] = useState('')
  const [selectedDataSource, setSelectedDataSource] = useState('')
  const [format, setFormat] = useState('json')
  const [timestampPath, setTimestampPath] = useState('ts')
  const [mappings, setMappings] = useState([])
  const [payload, setPayload] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const isAdmin = currentUser?.profile_name === 'Admin'

  const parsePath = (text) => {
    const value = text.trim()
    if (!value) return null
    const parts = []
    const pattern = /([^[.\]]+)|\[(\d+)\]/g
    let match
    let consumed = ''
    while ((match = pattern.exec(value)) !== null) {
      consumed += match[0]
      parts.push(match[2] !== undefined ? Number(match[2]) : match[1])
    }
    if (consumed.replace(/\s+/g, '') !== value.replace(/\s+/g, '')) {
      throw new Error(`Caminho inválido: ${text}`)
    }
    return parts
  }

  const formatPath = (path) => {
    if (!Array.isArray(path)) return ''
    return path.reduce((result, part) => {
      if (typeof part === 'number') return `${result}[${part}]`
      return result ? `${result}.${part}` : part
    }, '')
  }

  const configuration = () => ({
    version: 1,
    format,
    timestamp: timestampPath.trim() ? { path: parsePath(timestampPath) } : null,
    mappings: mappings.map((mapping) => ({
      metric: mapping.metric.trim(),
      path: parsePath(mapping.path),
      transform: mapping.transform === 'none'
        ? { type: 'none' }
        : { type: mapping.transform, value: Number(mapping.value) },
    })),
  })

  const loadStructure = async () => {
    setLoading(true)
    setError('')
    try {
      const [companyResult, connectionResult] = await Promise.all([
        fetchCompanies(),
        fetchConnections(),
      ])

      const activeCompanies = companyResult.filter((company) => company.active)
      const activeConnections = connectionResult.filter((connection) => connection.active)
      setCompanies(activeCompanies)
      setConnections(activeConnections)

      if (isAdmin) {
        setSelectedCompany(activeCompanies.length ? String(activeCompanies[0].id) : '')
      } else if (currentUser?.company_id) {
        setSelectedCompany(String(currentUser.company_id))
      }
    } catch (err) {
      setError(err.message || 'Não foi possível carregar empresas e conexões.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStructure()
  }, [currentUser?.id, currentUser?.company_id, currentUser?.profile_name])

  const companyConnections = connections.filter((connection) => String(connection.company_id) === String(selectedCompany))

  useEffect(() => {
    setSelectedConnection('')
    setSelectedDataSource('')
    setDataSources([])
    setResult(null)
    setError('')
    setSuccess('')
    if (companyConnections.length) {
      setSelectedConnection(String(companyConnections[0].id))
    }
  }, [selectedCompany])

  const selectedConnectionData = connections.find((connection) => String(connection.id) === String(selectedConnection))

  useEffect(() => {
    const sources = (selectedConnectionData?.dataSources || []).filter((source) => source.active)
    setDataSources(sources)
    setSelectedDataSource(sources.length ? String(sources[0].id) : '')
    setResult(null)
    setError('')
    setSuccess('')
  }, [selectedConnection])

  useEffect(() => {
    if (!selectedDataSource) {
      setPayload('')
      setMappings([])
      setFormat('json')
      setTimestampPath('ts')
      return
    }

    setError('')
    setSuccess('')
    setResult(null)
    Promise.all([
      fetchInterpretation(selectedDataSource),
      fetchRawMessages({ dataSourceId: selectedDataSource, page: 1, pageSize: 1 }),
    ]).then(([configResult, rawResult]) => {
      const config = configResult.interpretation
      if (config) {
        setFormat(config.format || 'json')
        setTimestampPath(formatPath(config.timestamp?.path))
        setMappings((config.mappings || []).map((mapping) => ({
          metric: mapping.metric,
          path: formatPath(mapping.path),
          transform: mapping.transform?.type || 'none',
          value: mapping.transform?.value ?? 1,
        })))
      } else {
        setFormat('json')
        setTimestampPath('ts')
        setMappings([])
      }
      const latest = rawResult.rows?.[0]
      setPayload(latest?.payload_text || '')
    }).catch((err) => setError(err.message || 'Não foi possível carregar a configuração.'))
  }, [selectedDataSource])

  const addMapping = () => {
    setMappings((current) => [...current, { metric: '', path: '', transform: 'none', value: 1 }])
  }

  const updateMapping = (index, field, value) => {
    setMappings((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )))
  }

  const removeMapping = (index) => {
    setMappings((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const buildConfiguration = () => {
    const config = configuration()
    if (!config.mappings.length) throw new Error('Adicione pelo menos uma métrica.')
    config.mappings.forEach((mapping, index) => {
      if (!mapping.metric) throw new Error(`Informe a métrica da regra ${index + 1}.`)
      if (!mapping.path) throw new Error(`Informe o caminho da regra ${index + 1}.`)
      if (mapping.transform.type !== 'none' && !Number.isFinite(mapping.transform.value)) {
        throw new Error(`Informe um valor de transformação válido na regra ${index + 1}.`)
      }
    })
    return config
  }

  const handleTest = async () => {
    setError('')
    setSuccess('')
    setResult(null)
    setBusy(true)
    try {
      if (!selectedDataSource) throw new Error('Selecione uma fonte de dados.')
      if (!payload.trim()) throw new Error('Informe ou carregue uma mensagem para testar.')
      const config = buildConfiguration()
      setResult(await testInterpretation(selectedDataSource, { payload, interpretation: config }))
    } catch (err) {
      setError(err.message || 'Não foi possível testar a interpretação.')
    } finally {
      setBusy(false)
    }
  }

  const handleSave = async () => {
    setError('')
    setSuccess('')
    setResult(null)
    setBusy(true)
    try {
      const config = buildConfiguration()
      await updateInterpretation(selectedDataSource, config)
      setSuccess('Interpretação salva com sucesso.')
    } catch (err) {
      setError(err.message || 'Não foi possível salvar a interpretação.')
    } finally {
      setBusy(false)
    }
  }

  const selectedCompanyData = companies.find((company) => String(company.id) === String(selectedCompany))

  if (loading) {
    return <div className="page-content"><h2>Interpretação</h2><div className="empty-state"><p>Carregando...</p></div></div>
  }

  return (
    <div className="page-content interpretation-page">
      <div className="raw-messages-header">
        <div>
          <h2>Interpretação de Dados</h2>
          <p className="page-description">Configure como uma mensagem bruta deve ser transformada em medições.</p>
        </div>
      </div>

      <section className="interpretation-card">
        <div className="interpretation-hierarchy">
          <div className="interpretation-hierarchy-step">
            <span className="interpretation-step-number">1</span>
            <div className="form-group">
              <label htmlFor="interpretation-company">Empresa</label>
              {isAdmin ? (
                <select id="interpretation-company" value={selectedCompany} onChange={(event) => setSelectedCompany(event.target.value)}>
                  <option value="">Selecione...</option>
                  {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                </select>
              ) : (
                <div className="interpretation-fixed-selection">
                  {selectedCompanyData?.name || 'Empresa do usuário'}
                </div>
              )}
            </div>
          </div>

          <div className="interpretation-hierarchy-step">
            <span className="interpretation-step-number">2</span>
            <div className="form-group">
              <label htmlFor="interpretation-connection">Conexão</label>
              <select id="interpretation-connection" value={selectedConnection} onChange={(event) => setSelectedConnection(event.target.value)} disabled={!selectedCompany}>
                <option value="">Selecione...</option>
                {companyConnections.map((connection) => <option key={connection.id} value={connection.id}>{connection.name} — {connection.type}</option>)}
              </select>
              {!selectedCompany && <small>Selecione uma empresa primeiro.</small>}
              {selectedCompany && !companyConnections.length && <small>Nenhuma conexão ativa nesta empresa.</small>}
            </div>
          </div>

          <div className="interpretation-hierarchy-step">
            <span className="interpretation-step-number">3</span>
            <div className="form-group">
              <label htmlFor="interpretation-source">Fonte de dados</label>
              <select id="interpretation-source" value={selectedDataSource} onChange={(event) => setSelectedDataSource(event.target.value)} disabled={!selectedConnection}>
                <option value="">Selecione...</option>
                {dataSources.map((source) => <option key={source.id} value={source.id}>{source.name}{source.topic ? ` — ${source.topic}` : ''}</option>)}
              </select>
              {!selectedConnection && <small>Selecione uma conexão primeiro.</small>}
              {selectedConnection && !dataSources.length && <small>Nenhuma fonte de dados ativa nesta conexão.</small>}
            </div>
          </div>
        </div>
      </section>

      <section className="interpretation-card">
        <div className="interpretation-grid">
          <div className="form-group">
            <label htmlFor="interpretation-format">Formato</label>
            <select id="interpretation-format" value={format} onChange={(event) => setFormat(event.target.value)}>
              <option value="json">JSON</option>
            </select>
          </div>
          <div className="form-group interpretation-timestamp-field">
            <label htmlFor="interpretation-timestamp">Caminho do timestamp</label>
            <input id="interpretation-timestamp" value={timestampPath} onChange={(event) => setTimestampPath(event.target.value)} placeholder="ts ou data.timestamp" disabled={!selectedDataSource} />
            <small>Use pontos para objetos e [n] para índices de arrays.</small>
          </div>
        </div>
      </section>

      <section className="interpretation-card">
        <div className="interpretation-section-header">
          <div>
            <h3>Regras de medição</h3>
            <p>Mapeie cada campo da mensagem para uma métrica numérica.</p>
          </div>
          <button className="btn-small" type="button" onClick={addMapping} disabled={!selectedDataSource}>Adicionar métrica</button>
        </div>

        {mappings.length === 0 ? (
          <div className="empty-state"><p>{selectedDataSource ? 'Nenhuma regra configurada.' : 'Selecione uma fonte de dados para configurar as regras.'}</p></div>
        ) : (
          <div className="interpretation-mappings">
            {mappings.map((mapping, index) => (
              <div className="interpretation-mapping" key={index}>
                <div className="form-group">
                  <label>Métrica</label>
                  <input value={mapping.metric} onChange={(event) => updateMapping(index, 'metric', event.target.value)} placeholder="Ex.: temperature_1" />
                </div>
                <div className="form-group">
                  <label>Caminho do campo</label>
                  <input value={mapping.path} onChange={(event) => updateMapping(index, 'path', event.target.value)} placeholder="Ex.: values[1]" />
                </div>
                <div className="form-group">
                  <label>Transformação</label>
                  <select value={mapping.transform} onChange={(event) => updateMapping(index, 'transform', event.target.value)}>
                    <option value="none">Nenhuma</option>
                    <option value="divide">Dividir</option>
                    <option value="multiply">Multiplicar</option>
                    <option value="add">Somar</option>
                    <option value="subtract">Subtrair</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Valor</label>
                  <input type="number" step="any" value={mapping.value} disabled={mapping.transform === 'none'} onChange={(event) => updateMapping(index, 'value', event.target.value)} />
                </div>
                <button className="btn-small danger" type="button" onClick={() => removeMapping(index)}>Remover</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="interpretation-card">
        <div className="interpretation-section-header">
          <div>
            <h3>Mensagem para teste</h3>
            <p>A tela carrega automaticamente a última mensagem bruta da fonte selecionada, quando disponível.</p>
          </div>
          <button className="btn-small" type="button" disabled={!selectedDataSource} onClick={async () => {
            try {
              const raw = await fetchRawMessages({ dataSourceId: selectedDataSource, page: 1, pageSize: 1 })
              if (raw.rows?.[0]?.payload_text) setPayload(raw.rows[0].payload_text)
              else setError('Nenhuma mensagem bruta disponível para esta fonte.')
            } catch (err) {
              setError(err.message || 'Não foi possível carregar a última mensagem.')
            }
          }}>Carregar última</button>
        </div>
        <textarea className="interpretation-payload" value={payload} onChange={(event) => setPayload(event.target.value)} rows="9" spellCheck="false" disabled={!selectedDataSource} />
      </section>

      {error && <div className="test-status error"><p>{error}</p></div>}
      {success && <div className="test-status success"><p>{success}</p></div>}

      <div className="interpretation-actions">
        <button className="btn-small" type="button" onClick={handleTest} disabled={busy || !selectedDataSource}>Testar interpretação</button>
        <button className="btn-test" type="button" onClick={handleSave} disabled={busy || !selectedDataSource}>Salvar interpretação</button>
      </div>

      {result && (
        <section className="interpretation-result">
          <h3>Resultado do teste</h3>
          <div className="interpretation-result-grid">
            <div>
              <h4>Measurements geradas</h4>
              {result.measurements?.length ? (
                <table className="slaves-table">
                  <thead><tr><th>Métrica</th><th>Timestamp</th><th>Valor</th></tr></thead>
                  <tbody>{result.measurements.map((item, index) => <tr key={index}><td>{item.metric}</td><td>{item.timestamp}</td><td>{item.value}</td></tr>)}</tbody>
                </table>
              ) : <div className="empty-state"><p>Nenhuma Measurement foi gerada.</p></div>}
            </div>
            <div>
              <h4>Erros</h4>
              {result.errors?.length ? (
                <ul>{result.errors.map((item, index) => <li key={index}><strong>{item.metric}:</strong> {item.reason}</li>)}</ul>
              ) : <p>Nenhum erro.</p>}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function AboutPage() {
  return (
    <div className="page-content">
      <h2>Ajuda / Sobre</h2>
      <p className="page-description">Informações básicas sobre o Taurus.</p>

      <section className="about-card">
        <div className="about-brand">Taurus</div>
        <div className="about-version">Versão {__APP_VERSION__}</div>
        <div className="about-build">Build {formatBuildTime(__BUILD_TIME__)}</div>
        <p>
          Plataforma de monitoramento e gerenciamento de dispositivos IoT.
        </p>
      </section>

      <section className="help-card">
        <h3>Ajuda rápida</h3>
        <ul>
          <li><strong>Conexão:</strong> teste a comunicação com o broker MQTT.</li>
          <li><strong>Empresas:</strong> cadastre e administre as empresas.</li>
          <li><strong>Usuários:</strong> cadastre usuários e defina seu perfil e empresa.</li>
        </ul>
      </section>
    </div>
  )
}


const WIDGET_SIZE_OPTIONS = [
  { value: '1x1', label: 'Pequeno — 1×1' },
  { value: '2x1', label: 'Largo — 2×1' },
  { value: '1x2', label: 'Alto — 1×2' },
  { value: '2x2', label: 'Grande — 2×2' },
  { value: '2x3', label: 'Grande vertical — 2×3' },
]

const getDefaultWidgetSize = (type) => {
  if (type === 'table') return '2x3'
  if (type === 'chart') return '2x2'
  return '1x1'
}

function DashboardWidget({ widget, onEdit, onDelete }) {
  const data = widget.data || {}
  const decimals = Number.isInteger(data.decimalPlaces) ? data.decimalPlaces : 1
  const formatValue = (value) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
    return Number(value).toFixed(decimals)
  }
  const unit = data.unit || ''

  const chartRows = data.sources?.[0]?.rows || []
  const values = chartRows.map((row) => Number(row.value)).filter((value) => Number.isFinite(value))
  const min = values.length ? Math.min(...values) : 0
  const max = values.length ? Math.max(...values) : 1
  const range = max - min || 1
  const width = 620
  const height = 190
  const points = chartRows.map((row, index) => {
    const x = chartRows.length === 1 ? width / 2 : (index / (chartRows.length - 1)) * width
    const y = height - ((Number(row.value) - min) / range) * (height - 20) - 10
    return `${x},${y}`
  }).join(' ')

  return (
    <section className={`dashboard-widget widget-${widget.type} widget-size-${data.size || getDefaultWidgetSize(widget.type)}`}>
      <div className="dashboard-widget-header">
        <div>
          <h3>{widget.name}</h3>
          <span>{data.metric || 'value'}{unit ? ` · ${unit}` : ''}</span>
        </div>
        <div className="dashboard-widget-actions">
          <button className="btn-small" onClick={() => onEdit(widget)}>Editar</button>
          <button className="btn-small danger" onClick={() => onDelete(widget)}>Excluir</button>
        </div>
      </div>

      {widget.type === 'value' && (
        <div className="dashboard-value-body">
          {data.sources?.length ? data.sources.map((source) => (
            <div className="dashboard-value-item" key={source.dataSourceId}>
              <small>{source.dataSourceName}</small>
              <strong>{formatValue(source.latest?.value)} <em>{unit}</em></strong>
              <span>{source.latest?.timestamp ? new Date(source.latest.timestamp).toLocaleString('pt-BR') : 'Sem medição'}</span>
            </div>
          )) : <div className="empty-state"><p>Sem Data Source vinculada.</p></div>}
        </div>
      )}

      {widget.type === 'chart' && (
        <div className="dashboard-chart-body">
          {chartRows.length ? (
            <>
              <svg className="dashboard-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={`Gráfico de ${widget.name}`}>
                <polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke" />
                {chartRows.map((row, index) => {
                  if (index !== 0 && index !== chartRows.length - 1 && index % Math.max(1, Math.floor(chartRows.length / 5)) !== 0) return null
                  const x = chartRows.length === 1 ? width / 2 : (index / (chartRows.length - 1)) * width
                  const y = height - ((Number(row.value) - min) / range) * (height - 20) - 10
                  return <circle key={`${row.id}-${index}`} cx={x} cy={y} r="4" fill="currentColor" />
                })}
              </svg>
              <div className="dashboard-chart-meta">
                <span>mín. {formatValue(min)} {unit}</span>
                <span>máx. {formatValue(max)} {unit}</span>
                <span>{chartRows.length} pontos</span>
              </div>
            </>
          ) : <div className="empty-state"><p>Sem medições no período configurado.</p></div>}
        </div>
      )}

      {widget.type === 'table' && (
        <div className="dashboard-table-wrap">
          <table className="slaves-table dashboard-data-table">
            <thead><tr><th>Data/Hora</th><th>Data Source</th><th>Valor</th></tr></thead>
            <tbody>
              {(data.sources || []).flatMap((source) =>
                (source.rows || []).map((row) => (
                  <tr key={`${source.dataSourceId}-${row.id}`}>
                    <td>{new Date(row.timestamp).toLocaleString('pt-BR')}</td>
                    <td>{source.dataSourceName}</td>
                    <td>{formatValue(row.value)} {unit}</td>
                  </tr>
                ))
              ).slice(0, 50)}
              {!data.sources?.some((source) => source.rows?.length) && <tr><td colSpan="3">Sem medições.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function DashboardPage() {
  const [dashboards, setDashboards] = useState([])
  const [companies, setCompanies] = useState([])
  const [dataSources, setDataSources] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showDashboardForm, setShowDashboardForm] = useState(false)
  const [showWidgetForm, setShowWidgetForm] = useState(false)
  const [editingWidget, setEditingWidget] = useState(null)
  const [dashboardForm, setDashboardForm] = useState({ name: '', description: '', companyId: '', isDefault: false })
  const [widgetForm, setWidgetForm] = useState({
    name: '', type: 'value', dataSourceId: '', metric: 'temperature_1', unit: '°C', decimalPlaces: 1, periodHours: 24,
  })
  const [busy, setBusy] = useState(false)
  const [widgetValidationError, setWidgetValidationError] = useState('')
  const widgetNameRef = useRef(null)


  const loadDashboards = async (preferredId = null) => {
    setLoading(true)
    setError('')
    try {
      const [list, companyList, sourceList] = await Promise.all([
        fetchDashboards(), fetchCompanies(), fetchDataSources(),
      ])
      setDashboards(list)
      setCompanies(companyList)
      setDataSources(sourceList)
      const id = preferredId || selectedId || list.find((item) => item.is_default)?.id || list[0]?.id || null
      setSelectedId(id)
    } catch (err) {
      setError(err.message || 'Não foi possível carregar os dashboards.')
    } finally {
      setLoading(false)
    }
  }

  const loadDashboard = async (id = selectedId) => {
    if (!id) {
      setDashboard(null)
      return
    }
    try {
      setDashboard(await fetchDashboard(id))
    } catch (err) {
      setError(err.message || 'Não foi possível carregar o dashboard.')
    }
  }

  useEffect(() => { loadDashboards() }, [])
  useEffect(() => { if (selectedId) loadDashboard(selectedId) }, [selectedId])

  useEffect(() => {
    if (!selectedId) return
    const timer = setInterval(() => loadDashboard(selectedId), 5000)
    return () => clearInterval(timer)
  }, [selectedId])

  const resetWidgetForm = () => {
    setWidgetForm({ name: '', type: 'value', dataSourceId: dataSources[0]?.id?.toString() || '', metric: 'temperature_1', unit: '°C', decimalPlaces: 1, periodHours: 24, size: '1x1' })
    setWidgetValidationError('')
    setEditingWidget(null)
    setShowWidgetForm(false)
  }

  const openNewWidget = () => {
    setEditingWidget(null)
    setWidgetValidationError('')
    setWidgetForm({
      name: '',
      type: 'value',
      dataSourceId: dataSources[0]?.id?.toString() || '',
      metric: 'temperature_1',
      unit: '°C',
      decimalPlaces: 1,
      periodHours: 24,
      size: '1x1',
    })
    setShowWidgetForm(true)
  }

  const openEditWidget = (widget) => {
    const cfg = widget.configuration || {}
    setEditingWidget(widget)
    setWidgetForm({
      name: widget.name,
      type: widget.type,
      dataSourceId: String(widget.data_source_ids?.[0] || ''),
      metric: cfg.metric || 'value',
      unit: cfg.unit || '',
      decimalPlaces: cfg.decimal_places ?? 1,
      periodHours: cfg.period_hours ?? 24,
      size: cfg.size || getDefaultWidgetSize(widget.type),
    })
    setShowWidgetForm(true)
  }

  const handleDashboardSubmit = async (event) => {
    event.preventDefault()
    if (!dashboardForm.name.trim() || !dashboardForm.companyId) return
    setBusy(true); setError('')
    try {
      const created = await createDashboard({
        companyId: Number(dashboardForm.companyId),
        name: dashboardForm.name.trim(),
        description: dashboardForm.description.trim() || null,
        isDefault: dashboardForm.isDefault,
      })
      setShowDashboardForm(false)
      setDashboardForm({ name: '', description: '', companyId: '', isDefault: false })
      await loadDashboards(created.id)
    } catch (err) {
      setError(err.message || 'Não foi possível criar o dashboard.')
    } finally { setBusy(false) }
  }

  const handleDashboardDelete = async () => {
    if (!dashboard || !window.confirm(`Excluir o dashboard "${dashboard.name}"? Os dados históricos não serão apagados.`)) return
    setBusy(true)
    try {
      await deleteDashboard(dashboard.id)
      setSelectedId(null); setDashboard(null)
      await loadDashboards()
    } catch (err) { setError(err.message || 'Não foi possível excluir o dashboard.') }
    finally { setBusy(false) }
  }

  const handleWidgetSubmit = async (event) => {
    event.preventDefault()
    if (!dashboard) return
    if (!widgetForm.name.trim()) {
      setWidgetValidationError('Informe um nome para o widget.')
      requestAnimationFrame(() => widgetNameRef.current?.focus())
      return
    }
    if (!widgetForm.dataSourceId) {
      setWidgetValidationError('Selecione uma Data Source.')
      return
    }
    if (!widgetForm.metric.trim()) {
      setWidgetValidationError('Informe uma métrica.')
      return
    }
    setWidgetValidationError('')
    setBusy(true); setError('')
    const payload = {
      dashboardId: dashboard.id,
      name: widgetForm.name.trim(),
      type: widgetForm.type,
      position: editingWidget?.position ?? (dashboard.widgets?.length || 0),
      dataSourceIds: [Number(widgetForm.dataSourceId)],
      configuration: {
        metric: widgetForm.metric.trim(),
        unit: widgetForm.unit.trim(),
        decimal_places: Number(widgetForm.decimalPlaces) || 0,
        period_hours: Number(widgetForm.periodHours) || 24,
        size: widgetForm.size || getDefaultWidgetSize(widgetForm.type),
      },
    }
    try {
      if (editingWidget) await updateWidget(editingWidget.id, payload)
      else await createWidget(payload)
      resetWidgetForm()
      await loadDashboard(dashboard.id)
    } catch (err) { setError(err.message || 'Não foi possível salvar o widget.') }
    finally { setBusy(false) }
  }

  const handleWidgetDelete = async (widget) => {
    if (!window.confirm(`Excluir o widget "${widget.name}"? As medições serão preservadas.`)) return
    setBusy(true)
    try { await deleteWidget(widget.id); await loadDashboard(dashboard.id) }
    catch (err) { setError(err.message || 'Não foi possível excluir o widget.') }
    finally { setBusy(false) }
  }

  return (
    <div className="page-content dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <h2>Dashboards</h2>
          <p className="page-description">Painéis de visualização construídos sobre as Measurements.</p>
        </div>
        <button className="btn-test" onClick={() => {
          setDashboardForm({ name: '', description: '', companyId: String(companies[0]?.id || ''), isDefault: dashboards.length === 0 })
          setShowDashboardForm(true)
        }}>+ Novo Dashboard</button>
      </div>

      {error && <div className="test-status error"><p>{error}</p></div>}

      {loading ? <div className="empty-state"><p>Carregando dashboards...</p></div> : (
        <>
          <div className="dashboard-list">
            {dashboards.map((item) => (
              <button key={item.id} className={`dashboard-list-item ${selectedId === item.id ? 'selected' : ''}`} onClick={() => setSelectedId(item.id)}>
                <strong>{item.name}</strong>
                <span>{item.company_name}</span>
                {item.is_default ? <em>★ Padrão</em> : null}
              </button>
            ))}
            {!dashboards.length && <div className="empty-state"><p>Nenhum dashboard disponível.</p></div>}
          </div>

          {dashboard && (
            <div className="dashboard-editor">
              <div className="dashboard-editor-header">
                <div>
                  <h2>{dashboard.name}</h2>
                  <p>{dashboard.description || 'Sem descrição.'} · {dashboard.company_name}</p>
                </div>
                <div className="dashboard-toolbar">
                  <button className="btn-small" onClick={openNewWidget}>+ Adicionar Widget</button>
                  <button className="btn-small danger" onClick={handleDashboardDelete} disabled={busy}>Excluir Dashboard</button>
                </div>
              </div>

              <div className="dashboard-grid">
                {(dashboard.widgets || []).map((widget) => (
                  <DashboardWidget key={widget.id} widget={widget} onEdit={openEditWidget} onDelete={handleWidgetDelete} />
                ))}
                {!dashboard.widgets?.length && <div className="empty-state"><p>Adicione um widget para começar.</p></div>}
              </div>
            </div>
          )}
        </>
      )}

      {showDashboardForm && (
        <div className="dashboard-modal-backdrop" onClick={() => setShowDashboardForm(false)}>
          <form className="dashboard-modal" onSubmit={handleDashboardSubmit} onClick={(event) => event.stopPropagation()}>
            <h3>Novo Dashboard</h3>
            <div className="form-group"><label>Nome</label><input value={dashboardForm.name} onChange={(e) => setDashboardForm({ ...dashboardForm, name: e.target.value })} placeholder="Ex.: Produção" autoFocus /></div>
            <div className="form-group"><label>Empresa</label><select value={dashboardForm.companyId} onChange={(e) => setDashboardForm({ ...dashboardForm, companyId: e.target.value })}><option value="">Selecione</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></div>
            <div className="form-group"><label>Descrição</label><input value={dashboardForm.description} onChange={(e) => setDashboardForm({ ...dashboardForm, description: e.target.value })} /></div>
            <label className="dashboard-check"><input type="checkbox" checked={dashboardForm.isDefault} onChange={(e) => setDashboardForm({ ...dashboardForm, isDefault: e.target.checked })} /> Dashboard padrão</label>
            <div className="dashboard-modal-actions"><button type="button" className="btn-small" onClick={() => setShowDashboardForm(false)}>Cancelar</button><button className="btn-test" disabled={busy}>Salvar</button></div>
          </form>
        </div>
      )}

      {showWidgetForm && (
        <div className="dashboard-modal-backdrop" onClick={resetWidgetForm}>
          <form className="dashboard-modal" onSubmit={handleWidgetSubmit} onClick={(event) => event.stopPropagation()}>
            <h3>{editingWidget ? 'Editar Widget' : 'Adicionar Widget'}</h3>
            <div className={`form-group ${widgetValidationError && !widgetForm.name.trim() ? 'has-error' : ''}`}><label htmlFor="dashboard-widget-name">Nome <span className="required-mark">*</span></label><input id="dashboard-widget-name" ref={widgetNameRef} value={widgetForm.name} onChange={(e) => { setWidgetForm({ ...widgetForm, name: e.target.value }); if (e.target.value.trim()) setWidgetValidationError('') }} placeholder="Ex.: Temperatura 1" autoFocus aria-invalid={Boolean(widgetValidationError && !widgetForm.name.trim())} />{widgetValidationError && !widgetForm.name.trim() && <div className="field-error">{widgetValidationError}</div>}</div>
            <div className="form-group"><label>Tipo</label><select value={widgetForm.type} onChange={(e) => setWidgetForm({ ...widgetForm, type: e.target.value, size: getDefaultWidgetSize(e.target.value) })}><option value="value">Valor atual</option><option value="chart">Gráfico</option><option value="table">Tabela</option></select></div>
            <div className="form-group"><label>Data Source</label><select value={widgetForm.dataSourceId} onChange={(e) => setWidgetForm({ ...widgetForm, dataSourceId: e.target.value })}><option value="">Selecione</option>{dataSources.map((source) => <option key={source.id} value={source.id}>{source.name}{source.topic ? ` — ${source.topic}` : ''}</option>)}</select></div>
            <div className="form-group"><label>Métrica</label><input value={widgetForm.metric} onChange={(e) => setWidgetForm({ ...widgetForm, metric: e.target.value })} placeholder="temperature_1" /></div>
            <div className="dashboard-form-row"><div className="form-group"><label>Unidade</label><input value={widgetForm.unit} onChange={(e) => setWidgetForm({ ...widgetForm, unit: e.target.value })} placeholder="°C" /></div><div className="form-group"><label>Casas decimais</label><input type="number" min="0" max="6" value={widgetForm.decimalPlaces} onChange={(e) => setWidgetForm({ ...widgetForm, decimalPlaces: e.target.value })} /></div></div><div className="form-group"><label>Tamanho</label><select value={widgetForm.size || getDefaultWidgetSize(widgetForm.type)} onChange={(e) => setWidgetForm({ ...widgetForm, size: e.target.value })}>{WIDGET_SIZE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><small className="form-help">O conteúdo permanece dentro do tamanho escolhido; tabelas usam rolagem interna.</small></div>
            {widgetForm.type === 'chart' && <div className="form-group"><label>Período (horas)</label><input type="number" min="1" max="720" value={widgetForm.periodHours} onChange={(e) => setWidgetForm({ ...widgetForm, periodHours: e.target.value })} /></div>}
            <div className="dashboard-modal-actions"><button type="button" className="btn-small" onClick={resetWidgetForm}>Cancelar</button><button className="btn-test" disabled={busy}>Salvar</button></div>
          </form>
        </div>
      )}
    </div>
  )
}

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState('home')
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatuses, setConnectionStatuses] = useState({})
  const socketRef = useRef(null)
  const mqttTestTimerRef = useRef(null)
  const [mqttTestSession, setMqttTestSession] = useState({
    isOpen: false,
    status: 'connecting',
    message: '',
    slaves: {},
    messages: [],
  })
  const [slaves, setSlaves] = useState({
    1: { t1: null, t2: null, ts: null },
    2: { t1: null, t2: null, ts: null },
    3: { t1: null, t2: null, ts: null },
    4: { t1: null, t2: null, ts: null },
  })

  useEffect(() => {
    fetchCurrentUser()
      .then((result) => {
        if (result.user) {
          setCurrentUser(result.user)
        }
      })
      .catch((err) => setAuthError(err.message || 'Não foi possível verificar a sessão.'))
      .finally(() => setAuthLoading(false))
  }, [])

  const handleLogin = (user) => {
    setAuthError('')
    setCurrentUser(user)
  }

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      setCurrentUser(null)
      setCurrentPage('home')
    }
  }

  useEffect(() => {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const socketUrl = `${protocol}//${location.host}`
    const socket = new WebSocket(socketUrl)
    socketRef.current = socket

    const handleOpen = () => {
      setIsConnected(true)
    }

    const handleClose = () => {
      setIsConnected(false)
    }

    const handleError = () => {
      setIsConnected(false)
    }

    const handleMessage = (event) => {
      try {
        const payload = JSON.parse(event.data)

        // Ignore connection messages
        if (payload && payload.type === 'connection') {
          return
        }

        if (payload && payload.type === 'connection_status') {
          setConnectionStatuses((previous) => ({ ...previous, [payload.connectionId]: payload }))
          return
        }

        if (payload && payload.type === 'mqtt_test_status') {
          if (payload.status === 'connected' || payload.status === 'error' || payload.status === 'disconnected') {
            if (mqttTestTimerRef.current) {
              clearTimeout(mqttTestTimerRef.current)
              mqttTestTimerRef.current = null
            }
          }
          setMqttTestSession((previous) => ({
            ...previous,
            isOpen: payload.status !== 'disconnected',
            status: payload.status,
            message: payload.message || '',
          }))
          return
        }

        if (payload && payload.type === 'connection_message') {
          setConnectionStatuses((previous) => ({
            ...previous,
            [payload.connectionId]: {
              ...(previous[payload.connectionId] || {}),
              status: 'connected',
              lastMessageAt: payload.receivedAt,
            },
          }))
          return
        }

        if (payload && payload.type === 'mqtt_test_message' && payload.data) {
          const { slave, t1, t2, ts } = payload.data
          setMqttTestSession((previous) => ({
            ...previous,
            slaves: {
              ...previous.slaves,
              [slave]: { t1, t2, ts },
            },
            messages: [
              ...previous.messages,
              { topic: payload.topic || 'Tópico MQTT', slave, t1, t2, ts },
            ].slice(-20),
          }))
          return
        }

        // Process MQTT data
        if (
          payload &&
          typeof payload.slave === 'number' &&
          typeof payload.t1 !== 'undefined' &&
          typeof payload.t2 !== 'undefined' &&
          typeof payload.ts === 'string'
        ) {
          setSlaves((prevSlaves) => ({
            ...prevSlaves,
            [payload.slave]: {
              t1: payload.t1,
              t2: payload.t2,
              ts: payload.ts,
            },
          }))
        }
      } catch (error) {
        console.warn('Mensagem WebSocket inválida:', error)
      }
    }

    socket.addEventListener('open', handleOpen)
    socket.addEventListener('close', handleClose)
    socket.addEventListener('error', handleError)
    socket.addEventListener('message', handleMessage)

    return () => {
      socket.removeEventListener('open', handleOpen)
      socket.removeEventListener('close', handleClose)
      socket.removeEventListener('error', handleError)
      socket.removeEventListener('message', handleMessage)
      socket.close()
      socketRef.current = null
    }
  }, [])

  const startMqttTest = (config) => {
    if (mqttTestTimerRef.current) {
      clearTimeout(mqttTestTimerRef.current)
      mqttTestTimerRef.current = null
    }

    // A modal de teste abre imediatamente. O cadastro permanece por baixo dela.
    setMqttTestSession({ isOpen: true, status: 'connecting', message: '', slaves: {}, messages: [] })

    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setMqttTestSession((previous) => ({
        ...previous,
        status: 'error',
        message: 'A conexão com o servidor Taurus não está disponível.',
      }))
      return
    }

    socket.send(JSON.stringify({ type: 'mqtt_test_start', config }))

    // Fallback no navegador para evitar que o teste fique indefinidamente em "Conectando".
    // A modal permanece aberta para o usuário ler a falha e fechá-la manualmente.
    mqttTestTimerRef.current = setTimeout(() => {
      mqttTestTimerRef.current = null
      setMqttTestSession((previous) => {
        if (!previous.isOpen || previous.status !== 'connecting') {
          return previous
        }
        return {
          ...previous,
          status: 'error',
          message: 'Tempo limite excedido. Não foi possível conectar ao broker MQTT.',
        }
      })
    }, 10000)
  }

  const stopMqttTest = () => {
    if (mqttTestTimerRef.current) {
      clearTimeout(mqttTestTimerRef.current)
      mqttTestTimerRef.current = null
    }
    const socket = socketRef.current
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'mqtt_test_stop' }))
    }
    setMqttTestSession({ isOpen: false, status: 'connecting', message: '', slaves: {}, messages: [] })
  }

  useEffect(() => () => {
    if (mqttTestTimerRef.current) {
      clearTimeout(mqttTestTimerRef.current)
    }
  }, [])

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false)
    }
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
    closeSidebarOnMobile()
  }

  if (authLoading) {
    return <div className="login-screen"><div className="empty-state"><p>Carregando...</p></div></div>
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <div className="app">
      <header className="app-header">
        <button
          className="menu-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle menu"
        >
          ☰
        </button>

        <div className="header-brand">
          <svg className="taurus-symbol" viewBox="0 0 40 40" width="32" height="32">
            <circle cx="20" cy="20" r="18" fill="none" stroke="#d4af37" strokeWidth="2" />
            <path
              d="M 14 16 Q 20 12 26 16"
              fill="none"
              stroke="#d4af37"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line x1="14" y1="16" x2="12" y2="10" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" />
            <line x1="26" y1="16" x2="28" y2="10" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" />
            <path
              d="M 15 20 L 20 28 L 25 20"
              fill="none"
              stroke="#d4af37"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h1 className="header-title">Taurus</h1>
        </div>
        {currentUser && (
          <div className="header-user">
            <span>{currentUser.name}</span>
            <button className="btn-small" onClick={handleLogout}>Sair</button>
          </div>
        )}
      </header>

      <div className="app-container">
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <nav className="sidebar-nav">
            <button
              className={`nav-item ${currentPage === 'home' ? 'active' : ''}`}
              onClick={() => handlePageChange('home')}
            >
              Início
            </button>
            <button
              className={`nav-item ${currentPage === 'connection' ? 'active' : ''}`}
              onClick={() => handlePageChange('connection')}
            >
              Conexão
            </button>
            <button
              className={`nav-item ${currentPage === 'raw-messages' ? 'active' : ''}`}
              onClick={() => handlePageChange('raw-messages')}
            >
              Mensagens Brutas
            </button>
            <button
              className={`nav-item ${currentPage === 'measurements' ? 'active' : ''}`}
              onClick={() => handlePageChange('measurements')}
            >
              Medições
            </button>
            <button
              className={`nav-item ${currentPage === 'dashboards' ? 'active' : ''}`}
              onClick={() => handlePageChange('dashboards')}
            >
              Dashboards
            </button>
            <button
              className={`nav-item ${currentPage === 'interpretation' ? 'active' : ''}`}
              onClick={() => handlePageChange('interpretation')}
            >
              Interpretação
            </button>
            <button
              className={`nav-item ${currentPage === 'companies' ? 'active' : ''}`}
              onClick={() => handlePageChange('companies')}
            >
              Empresas
            </button>
            <button
              className={`nav-item ${currentPage === 'users' ? 'active' : ''}`}
              onClick={() => handlePageChange('users')}
            >
              Usuários
            </button>
            {currentUser.profile_name === 'Admin' && (
              <button
                className={`nav-item ${currentPage === 'system-settings' ? 'active' : ''}`}
                onClick={() => handlePageChange('system-settings')}
              >
                Parâmetros do Sistema
              </button>
            )}
            <button
              className={`nav-item ${currentPage === 'about' ? 'active' : ''}`}
              onClick={() => handlePageChange('about')}
            >
              Ajuda / Sobre
            </button>
          </nav>
        </aside>

        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

        <main className="main-content">
          {currentPage === 'home' && <HomePage />}
          {currentPage === 'connection' && (
            <ConnectionPage isTestActive={mqttTestSession.isOpen} onStartTest={startMqttTest} runtimeStatuses={connectionStatuses} />
          )}
          {currentPage === 'raw-messages' && <RawMessagesPage />}
          {currentPage === 'measurements' && <MeasurementsPage />}
          {currentPage === 'dashboards' && <DashboardPage />}
          {currentPage === 'interpretation' && <InterpretationPage currentUser={currentUser} />}
          {currentPage === 'companies' && <CompaniesPage />}
          {currentPage === 'users' && <UsersPage />}
          {currentPage === 'system-settings' && currentUser.profile_name === 'Admin' && <SystemSettingsPage />}
          {currentPage === 'about' && <AboutPage />}
        </main>
      </div>

      {mqttTestSession.isOpen && <MqttTestModal session={mqttTestSession} onClose={stopMqttTest} />}

      <footer className="app-footer">
        <div className="footer-content">
          <span className="footer-brand">Taurus</span>
          <span className="footer-version">v{__APP_VERSION__}</span>
          <span className="footer-build">Build {formatBuildTime(__BUILD_TIME__)}</span>
        </div>
      </footer>
    </div>
  )
}

export default App
