// routes/index.js
const fs = require('fs');
const path = require('path');

const routes = {};

// Automatically load all route files in this directory
fs.readdirSync(__dirname)
  .filter(file => file !== 'index.js' && file.endsWith('.js'))
  .forEach(file => {
    const routeName = path.basename(file, '.js');
    routes[`/api/${routeName}`] = require(`./${file}`);
  });

// Main router function
module.exports = (req, res) => {
  const { pathname } = new URL(req.url, `https://${req.headers.host}`);
  
  // Find matching route
  const routeKey = Object.keys(routes).find(route => pathname.startsWith(route));
  
  if (routeKey) {
    try {
      // Pass request to endpoint handler
      return routes[routeKey](req, res);
    } catch (error) {
      console.error(`Error in ${routeKey} handler:`, error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  } else {
    // No matching route
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  }
};