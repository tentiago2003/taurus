const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const { createMqttConnection, startMqtt } = require('./mqtt/client');
const { initDatabase } = require('./db');
const { handleApiRequest } = require('./http/api');
const usersService = require('./services/users.service');

initDatabase();
usersService.bootstrapAdmin();

const port = Number(process.env.PORT) || 3000;
const distPath = path.join(__dirname, '..', 'frontend', 'dist');
const indexPath = path.join(distPath, 'index.html');

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

const server = http.createServer(async (req, res) => {
  if (await handleApiRequest(req, res)) {
    return;
  }

  if (req.method !== 'GET') {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Not Found');
    return;
  }

  // Route "/" to index.html
  if (req.url === '/') {
    fs.readFile(indexPath, 'utf8', (err, content) => {
      if (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Internal Server Error');
        return;
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(content);
    });
    return;
  }

  // Serve static files from dist/
  const filePath = path.join(distPath, req.url);
  
  // Ensure the resolved path is within distPath (prevent directory traversal)
  if (!filePath.startsWith(distPath)) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Not Found');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Not Found');
      return;
    }

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Internal Server Error');
        return;
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', getContentType(filePath));
      res.end(content);
    });
  });
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Taurus WebSocket client connected');
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'Taurus WebSocket connected',
  }));

  let testConnection;

  function sendTestStatus(status, message) {
    if (ws.readyState !== ws.OPEN) {
      return;
    }

    ws.send(JSON.stringify({
      type: 'mqtt_test_status',
      status,
      ...(message ? { message } : {}),
    }));
  }

  function stopMqttTest(notify = true) {
    if (!testConnection) {
      return;
    }

    testConnection.disconnect();
    testConnection = undefined;
    if (notify) {
      sendTestStatus('disconnected');
    }
  }

  function handleTestError(connection, error) {
    if (testConnection !== connection) {
      return;
    }

    sendTestStatus('error', `Não foi possível concluir o teste MQTT: ${error.message}`);
    stopMqttTest(false);
  }

  function startMqttTest(config) {
    if (testConnection) {
      sendTestStatus('error', 'Já existe um teste MQTT ativo nesta conexão.');
      return;
    }

    const topics = Array.isArray(config.topics)
      ? config.topics.map((topic) => String(topic).trim()).filter(Boolean)
      : [];
    const mqttPort = Number(config.port);

    if (!config.host || !Number.isInteger(mqttPort) || mqttPort <= 0 || topics.length === 0) {
      sendTestStatus('error', 'Informe host, porta válida e ao menos um tópico MQTT.');
      return;
    }

    sendTestStatus('connecting');
    const connection = createMqttConnection({
      host: config.host,
      port: mqttPort,
      username: config.username,
      password: config.password,
    });
    testConnection = connection;

    connection
      .onConnect(async () => {
        try {
          await connection.subscribe(topics);
          if (testConnection === connection) {
            sendTestStatus('connected');
          }
        } catch (error) {
          handleTestError(connection, error);
        }
      })
      .onMessage((data) => {
        if (testConnection === connection && ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'mqtt_test_message', data }));
        }
      })
      .onError((error) => handleTestError(connection, error));

    connection.connect();
  }

  ws.on('message', (message) => {
    try {
      const payload = JSON.parse(message.toString());
      if (payload.type === 'mqtt_test_start') {
        startMqttTest(payload.config || {});
      } else if (payload.type === 'mqtt_test_stop') {
        stopMqttTest();
      }
    } catch (error) {
      sendTestStatus('error', 'Mensagem de controle MQTT inválida.');
    }
  });

  ws.on('close', () => {
    stopMqttTest(false);
  });
});

function broadcastToOpenClients(message) {
  const payload = JSON.stringify(message);

  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(payload);
    }
  });
}

server.listen(port, () => {
  console.log(`Taurus HTTP server running on port ${port}`);

  startMqtt((mqttObject) => {
    broadcastToOpenClients(mqttObject);
  });
});
