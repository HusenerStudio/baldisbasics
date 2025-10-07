// Simple static file server for previewing the game
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.HTTP_PORT || 3000;
const ROOT = __dirname;

const mime = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ogg': 'audio/ogg'
};

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);
  let filePath = path.join(ROOT, decodeURI(parsed.pathname));
  if (req.url === '/' || fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(ROOT, 'index.html');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Preview server running at http://localhost:${PORT}/`);
});