const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const { startMqtt } = require('./mqtt/client');

const port = Number(process.env.PORT) || 3000;
const indexPath = path.join(__dirname, '..', 'frontend', 'index.html');

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
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

  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Not Found');
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
