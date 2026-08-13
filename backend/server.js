const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const mqtt = require('mqtt');
const { startMqtt } = require('./mqtt/client');

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

// Helper function to read request body
function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      resolve(body);
    });
    req.on('error', reject);
  });
}

// Handle POST /api/mqtt/test
async function handleMqttTest(req, res, body) {
  try {
    const data = JSON.parse(body);
    const { host, port: mqttPort, username, password, topics } = data;

    // Validation
    if (!host || !mqttPort) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: false,
        message: 'host and port are required',
      }));
      return;
    }

    if (!Array.isArray(topics) || topics.length === 0) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: false,
        message: 'topics must be a non-empty array',
      }));
      return;
    }

    // Create temporary MQTT connection
    const testClient = mqtt.connect({
      host,
      port: Number(mqttPort),
      username,
      password,
      connectTimeout: 5000,
    });

    // Setup success/error handlers with timeout
    let connected = false;
    let responded = false;

    const timeoutHandle = setTimeout(() => {
      if (!responded) {
        responded = true;
        testClient.end(true);
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          success: false,
          message: 'MQTT connection timeout',
        }));
      }
    }, 8000);

    testClient.on('connect', () => {
      connected = true;
      if (!responded) {
        responded = true;
        clearTimeout(timeoutHandle);
        testClient.end(true);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          success: true,
          message: 'MQTT connection successful',
        }));
      }
    });

    testClient.on('error', (error) => {
      if (!responded) {
        responded = true;
        clearTimeout(timeoutHandle);
        testClient.end(true);
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          success: false,
          message: `MQTT connection error: ${error.message}`,
        }));
      }
    });
  } catch (err) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: false,
      message: `Invalid request: ${err.message}`,
    }));
  }
}

const server = http.createServer(async (req, res) => {
  // Handle POST /api/mqtt/test
  if (req.method === 'POST' && req.url === '/api/mqtt/test') {
    const body = await readRequestBody(req);
    await handleMqttTest(req, res, body);
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
