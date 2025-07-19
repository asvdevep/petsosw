const https = require('https');
const fs = require('fs');
const path = require('path');
const routeHandler = require('./routes'); // Import the router

const PORT = 443;
const sslOptions = {
  key: fs.readFileSync('/var/www/nodesrv/ssl/new.private.key'),
  cert: fs.readFileSync('/var/www/nodesrv/ssl/www.asvdevep.com.pem')
};

const server = https.createServer(sslOptions, (req, res) => {
  const { pathname } = new URL(req.url, `https://${req.headers.host}`);
  
  // Handle API requests
  if (pathname.startsWith('/api/')) {
    return routeHandler(req, res);
  }
  
  // Serve static files
  serveStaticFiles(req, res);
});


function serveStaticFiles(req, res) {
    const parsedUrl = url.parse(req.url);
    let pathname = path.join(__dirname, parsedUrl.pathname);
    
    // Default to index.html for root
    if (pathname === path.join(__dirname, '/')) {
        pathname = path.join(__dirname, 'index.html');
    }

    // Security: Prevent directory traversal
    if (!pathname.startsWith(__dirname + path.sep)) {
        res.writeHead(403);
        return res.end('Forbidden');
    }

    fs.readFile(pathname, (err, data) => {
        if (err) {
            handleFileError(err, res);
            return;
        }
        
        // Set content type based on file extension
        const ext = path.extname(pathname);
        const contentType = getContentType(ext);
        
        res.writeHead(200, {'Content-Type': contentType});
        res.end(data);
    });
}


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

server.listen(PORT, () => {
  console.log(`HTTPS server running on port ${PORT}`);
  console.log('Available endpoints:');
  console.log(Object.keys(require('./routes').routes)
        .map(route => `  https://localhost${route}`)
        .join('\n'));
});