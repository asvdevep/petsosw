const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const routeHandler = require('./routes');

// Environment configuration
const ENV = process.env;
const IS_PROD = ENV.NODE_ENV === 'production';
const IS_DEV = !IS_PROD;

// SSL configuration
const sslOptions = {
  key: fs.readFileSync(path.resolve(ENV.SSL_KEY_PATH)),
  cert: fs.readFileSync(path.resolve(ENV.SSL_CERT_PATH)),
  minVersion: ENV.SECURITY_MIN_TLS,
  ciphers: ENV.SECURITY_CIPHERS,
  honorCipherOrder: true,
  secureOptions: IS_PROD ? 
    (require('constants').SSL_OP_NO_SSLv2 | 
     require('constants').SSL_OP_NO_SSLv3 |
     require('constants').SSL_OP_NO_TLSv1 |
     require('constants').SSL_OP_NO_TLSv1_1) : 0
};

// Security headers configuration
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Content-Security-Policy': "default-src 'self'",
  ...(IS_PROD && {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
  })
};

// Create HTTPS server
const server = https.createServer(sslOptions, (req, res) => {
  // Apply security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
  const { pathname } = new URL(req.url, `https://${req.headers.host}`);
  
  // Handle API requests
  if (pathname.startsWith('/api/')) {
    return routeHandler(req, res);
  }
  
  // Serve static files
  serveStaticFiles(req, res);
});

// Static file serving function
function serveStaticFiles(req, res) {
  const parsedUrl = new URL(req.url, `https://${req.headers.host}`);
  let pathname = path.join(__dirname, parsedUrl.pathname);
  
  // Default to index.html for root
  if (pathname.endsWith('/') || pathname === path.join(__dirname, '/')) {
    pathname = path.join(__dirname, 'index.html');
  }
  
  // Security: Prevent directory traversal
  if (!pathname.startsWith(path.join(__dirname, path.sep))) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  
  fs.readFile(pathname, (err, data) => {
    if (err) {
      handleFileError(err, res);
      return;
    }
    
    // Set content type
    const ext = path.extname(pathname);
    const contentType = getContentType(ext);
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

// Helper functions
function handleFileError(err, res) {
  if (err.code === 'ENOENT') {
    res.writeHead(404);
    res.end('File not found');
  } else {
    res.writeHead(500);
    res.end('Server error');
  }
}

function getContentType(ext) {
  const types = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml'
  };
  return types[ext] || 'text/plain';
}

// Start HTTPS server
server.listen(ENV.HTTPS_PORT, () => {
  console.log(`Server running in ${IS_PROD ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);
  console.log(`HTTPS: https://localhost:${ENV.HTTPS_PORT}`);
  console.log(`Using SSL certificate: ${ENV.SSL_CERT_PATH}`);
});

// HTTP redirect
http.createServer((req, res) => {
  const httpsPort = ENV.HTTPS_PORT == 443 ? '' : `:${ENV.HTTPS_PORT}`;
  res.writeHead(301, {
    "Location": `https://${req.headers.host.split(':')[0]}${httpsPort}${req.url}`
  });
  res.end();
}).listen(ENV.HTTP_PORT, () => {
  console.log(`HTTP redirect running on port ${ENV.HTTP_PORT}`);
});