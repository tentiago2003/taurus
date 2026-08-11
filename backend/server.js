const http = require('http');

const port = Number(process.env.PORT) || 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Taurus API is running');
});

server.listen(port, () => {
  console.log(`Taurus HTTP server running on port ${port}`);
});
