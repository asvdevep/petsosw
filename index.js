const express = require('express');
const path = require('path');
const https = require('https');
const http = require('http');
const fs = require('fs');

const app = express();
const HTTPS_PORT = 443;
const HTTP_PORT = 80;

// SSL/TLS options
const options = {
  cert: fs.readFileSync('/var/www/nodesrv/ssl/www.asvdevep.com.pem'),
  key: fs.readFileSync('/var/www/nodesrv/ssl/new.private.key')
};

// Serve static files from the current directory
app.use(express.static(__dirname));

// Route for the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Create HTTPS server
https.createServer(options, app).listen(HTTPS_PORT, () => {
    console.log(`HTTPS Server running at https://localhost:${HTTPS_PORT}/`);
});

// Optional: Redirect HTTP to HTTPS
http.createServer((req, res) => {
    res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
    res.end();
}).listen(HTTP_PORT, () => {
    console.log(`HTTP Server running at http://localhost:${HTTP_PORT}/ (redirecting to HTTPS)`);
});