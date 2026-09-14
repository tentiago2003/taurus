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
  const emptyTopic = () => ({ id: null, name: '', topic: '', samplingIntervalSeconds: 600, storeHistory: true, active: true })
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

  const loadAll = async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const [connectionData, companyData] = await Promise.all([fetchConnections(), fetchCompanies()])
      setConnections(connectionData)
      setCompanies(companyData)
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
        samplingIntervalSeconds: source.sampling_interval_seconds || 600,
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
          samplingIntervalSeconds: Number(topic.samplingIntervalSeconds) || 600,
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

  const handleShowEvents = async (connection) => {
    setEventConnection(connection)
    setEvents([])
    setEventsLoading(true)
    try {
      setEvents(await fetchConnectionEvents(connection.id))
    } catch (err) {
      setActionError(err.message || 'Não foi possível carregar o log da conexão.')
      setEventConnection(null)
    } finally {
      setEventsLoading(false)
    }
  }

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
            {eventsLoading ? <div className="empty-state"><p>Carregando eventos...</p></div> : events.length === 0 ? <div className="empty-state"><p>Nenhum evento registrado.</p></div> : (
              <div className="connection-events-list">
                {events.map((event) => (
                  <div className="connection-event-row" key={event.id}>
                    <span className="connection-event-time">{event.timestamp}</span>
                    <span className={`connection-event-type event-${event.event_type.toLowerCase()}`}>{event.event_type}</span>
                    <span className="connection-event-message">{event.message || ''}</span>
                  </div>
                ))}
              </div>
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
          {currentPage === 'companies' && <CompaniesPage />}
          {currentPage === 'users' && <UsersPage />}
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
