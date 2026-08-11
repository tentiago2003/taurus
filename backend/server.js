const http = require('http');
const { WebSocketServer } = require('ws');
const { startMqtt } = require('./mqtt/client');

const port = Number(process.env.PORT) || 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Taurus API is running');
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
