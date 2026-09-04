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
  createUser,
  updateUser,
  deactivateUser,
  reactivateUser,
  login,
  fetchCurrentUser,
  logout,
} from './api'

const APP_VERSION = '0.1.0'
const DEFAULT_MQTT_HOST = 'broker.hivemq.com'
const DEFAULT_MQTT_PORT = '1883'
const DEFAULT_MQTT_USER = 'CTa_Mqtt'
const DEFAULT_MQTT_PASS = 'Senha_cta'
const DEFAULT_MQTT_TOPICS = ['P2P-IoT/G001/LoRa1', 'P2P-IoT/G001/LoRa2', 'P2P-IoT/G001/LoRa3', 'P2P-IoT/G001/LoRa4']

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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

function ConnectionPage({ isTestActive, onStartTest }) {
  const [formData, setFormData] = useState({
    host: DEFAULT_MQTT_HOST,
    port: DEFAULT_MQTT_PORT,
    user: DEFAULT_MQTT_USER,
    pass: DEFAULT_MQTT_PASS,
  })
  const [topics, setTopics] = useState(DEFAULT_MQTT_TOPICS)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleTopicChange = (index, value) => {
    setTopics((prev) => prev.map((topic, i) => (i === index ? value : topic)))
  }

  const handleAddTopic = () => {
    setTopics((prev) => [...prev, ''])
  }

  const handleRemoveTopic = (index) => {
    setTopics((prev) => prev.filter((_, i) => i !== index))
  }

  const handleTestConnection = () => {
    const topicsArray = topics
      .map(t => t.trim())
      .filter(t => t.length > 0)

    onStartTest({
      host: formData.host,
      port: formData.port,
      username: formData.user,
      password: formData.pass,
      topics: topicsArray,
    })
  }

  return (
    <div className="page-content">
      <h2>Configuração da conexão MQTT</h2>

      <div className="connection-form">
        <div className="form-group">
          <label htmlFor="host">Host</label>
          <input
            type="text"
            id="host"
            name="host"
            value={formData.host}
            onChange={handleInputChange}
            placeholder="localhost"
          />
        </div>

        <div className="form-group">
          <label htmlFor="port">Porta</label>
          <input
            type="text"
            id="port"
            name="port"
            value={formData.port}
            onChange={handleInputChange}
            placeholder="1883"
          />
        </div>

        <div className="form-group">
          <label htmlFor="user">Usuário</label>
          <input
            type="text"
            id="user"
            name="user"
            value={formData.user}
            onChange={handleInputChange}
            placeholder="user"
          />
        </div>

        <div className="form-group">
          <label htmlFor="pass">Senha</label>
          <input
            type="password"
            id="pass"
            name="pass"
            value={formData.pass}
            onChange={handleInputChange}
            placeholder="pass"
          />
        </div>

        <div className="form-group">
          <label>Tópicos MQTT</label>
          <div className="topics-list">
            {topics.map((topic, index) => (
              <div className="topic-row" key={index}>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => handleTopicChange(index, e.target.value)}
                  placeholder="ex: P2P-IoT/G001/LoRa1"
                />
                <button
                  type="button"
                  className="btn-remove-topic"
                  onClick={() => handleRemoveTopic(index)}
                  aria-label="Remover tópico"
                >
                  −
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn-add-topic" onClick={handleAddTopic}>
            + Adicionar tópico
          </button>
        </div>

        <button className="btn-test" onClick={handleTestConnection} disabled={isTestActive}>
          Testar conexão
        </button>
      </div>
    </div>
  )
}

function MqttTestModal({ session, onClose }) {
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
          <div className="slaves-container">
            <table className="slaves-table">
              <thead>
                <tr><th>Slave</th><th>T1</th><th>T2</th><th>Última atualização</th></tr>
              </thead>
              <tbody>
                {slaves.length === 0 ? (
                  <tr><td className="empty" colSpan="4">Aguardando mensagens MQTT...</td></tr>
                ) : slaves.map(([slave, data]) => (
                  <tr key={slave}>
                    <td>{slave}</td>
                    <td className="value">{data.t1}</td>
                    <td className="value">{data.t2}</td>
                    <td>{data.ts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button className="btn-close-test" onClick={onClose}>Fechar teste</button>
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
  const socketRef = useRef(null)
  const [mqttTestSession, setMqttTestSession] = useState({
    isOpen: false,
    status: 'connecting',
    message: '',
    slaves: {},
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

        if (payload && payload.type === 'mqtt_test_status') {
          setMqttTestSession((previous) => ({
            ...previous,
            isOpen: payload.status !== 'disconnected',
            status: payload.status,
            message: payload.message || '',
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
    setMqttTestSession({ isOpen: true, status: 'connecting', message: '', slaves: {} })
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
  }

  const stopMqttTest = () => {
    const socket = socketRef.current
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'mqtt_test_stop' }))
    }
    setMqttTestSession({ isOpen: false, status: 'connecting', message: '', slaves: {} })
  }

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
          </nav>
        </aside>

        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

        <main className="main-content">
          {currentPage === 'home' && <HomePage />}
          {currentPage === 'connection' && (
            <ConnectionPage isTestActive={mqttTestSession.isOpen} onStartTest={startMqttTest} />
          )}
          {currentPage === 'companies' && <CompaniesPage />}
          {currentPage === 'users' && <UsersPage />}
        </main>
      </div>

      {mqttTestSession.isOpen && <MqttTestModal session={mqttTestSession} onClose={stopMqttTest} />}

      <footer className="app-footer">
        <div className="footer-content">
          <span className="footer-brand">Taurus</span>
          <span className="footer-version">v{APP_VERSION}</span>
          <span className="footer-build">Build {formatBuildTime(__BUILD_TIME__)}</span>
        </div>
      </footer>
    </div>
  )
}

export default App
