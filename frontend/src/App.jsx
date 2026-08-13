import { useState, useEffect } from 'react'

const APP_VERSION = '0.1.0'
const DEFAULT_MQTT_HOST = 'broker.hivemq.com'
const DEFAULT_MQTT_PORT = '1883'
const DEFAULT_MQTT_USER = 'CTa_Mqtt'
const DEFAULT_MQTT_PASS = 'Senha_cta'
const DEFAULT_MQTT_TOPICS = ['P2P-IoT/G001/LoRa1', 'P2P-IoT/G001/LoRa2', 'P2P-IoT/G001/LoRa3', 'P2P-IoT/G001/LoRa4']

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

function ConnectionPage() {
  const [testStatus, setTestStatus] = useState('untested') // 'untested', 'testing', 'success', 'error'
  const [formData, setFormData] = useState({
    host: DEFAULT_MQTT_HOST,
    port: DEFAULT_MQTT_PORT,
    user: DEFAULT_MQTT_USER,
    pass: DEFAULT_MQTT_PASS,
    topics: DEFAULT_MQTT_TOPICS.join('\n'),
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleTestConnection = async () => {
    setTestStatus('testing')
    
    // Parse topics from textarea (one per line)
    const topicsArray = formData.topics
      .split('\n')
      .map(t => t.trim())
      .filter(t => t.length > 0)
    
    // Prepare request payload
    const payload = {
      host: formData.host,
      port: formData.port,
      username: formData.user,
      password: formData.pass,
      topics: topicsArray,
    }
    
    try {
      const response = await fetch('/api/mqtt/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        setTestStatus('success')
      } else {
        setTestStatus('error')
      }
    } catch (err) {
      console.error('Test connection error:', err)
      setTestStatus('error')
    }
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
          <label htmlFor="topics">Tópicos MQTT</label>
          <textarea
            id="topics"
            name="topics"
            value={formData.topics}
            onChange={handleInputChange}
            rows="6"
            placeholder="Um tópico por linha"
          ></textarea>
        </div>

        <button className="btn-test" onClick={handleTestConnection}>
          Testar conexão
        </button>

        <div className={`test-status ${testStatus}`}>
          {testStatus === 'untested' && <p>Conexão não testada</p>}
          {testStatus === 'testing' && <p>Testando conexão...</p>}
          {testStatus === 'success' && <p>✓ Conexão bem-sucedida</p>}
          {testStatus === 'error' && <p>✗ Falha na conexão</p>}
        </div>
      </div>
    </div>
  )
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState('home')
  const [isConnected, setIsConnected] = useState(false)
  const [slaves, setSlaves] = useState({
    1: { t1: null, t2: null, ts: null },
    2: { t1: null, t2: null, ts: null },
    3: { t1: null, t2: null, ts: null },
    4: { t1: null, t2: null, ts: null },
  })

  useEffect(() => {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const socketUrl = `${protocol}//${location.host}`
    const socket = new WebSocket(socketUrl)

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
    }
  }, [])

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
          </nav>
        </aside>

        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

        <main className="main-content">
          {currentPage === 'home' && <HomePage />}
          {currentPage === 'connection' && <ConnectionPage />}
        </main>
      </div>

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
