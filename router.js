const fs = require('fs');
const path = require('path');
const url = require('url');

const API_PREFIX = '/api'; // Base path for all APIs

// 1. Load all API modules dynamically
const apiHandlers = {};

fs.readdirSync(path.join(__dirname, 'apis'))
  .filter(file => file.endsWith('.js'))
  .forEach(file => {
    const apiName = file.replace('.js', '');
    apiHandlers[apiName] = require(`./apis/${file}`);
    
    console.log(`✅ Loaded API: /api/${apiName}`);
  });

// 2. Main request handler
module.exports = (req, res) => {
  const { pathname } = url.parse(req.url, true);
  const method = req.method.toLowerCase();

  // 3. Skip non-API routes
  if (!pathname.startsWith(API_PREFIX)) {
    return serveStaticFiles(req, res);
  }

  // 4. Extract API endpoint (e.g. 'devices' from '/api/devices/command')
  const endpoint = pathname.split('/')[2];
  
  if (!endpoint || !apiHandlers[endpoint]) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ 
      error: 'API endpoint not found',
      availableEndpoints: Object.keys(apiHandlers)
    }));
  }

  // 5. Dynamic method handling
  const handler = apiHandlers[endpoint][method];
  
  if (typeof handler === 'function') {
    return handler(req, res);
  }

  // 6. Method not allowed
  res.writeHead(405, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    error: 'Method not allowed',
    allowedMethods: Object.keys(apiHandlers[endpoint])
      .filter(k => typeof apiHandlers[endpoint][k] === 'function')
  }));
};

// Static file serving (unchanged)
function serveStaticFiles(req, res) { /* ... */ }