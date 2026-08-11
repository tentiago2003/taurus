const http = require('http');
const { WebSocketServer } = require('ws');

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

server.listen(port, () => {
  console.log(`Taurus HTTP server running on port ${port}`);
});
