// routes/users.js
const querystring = require('querystring');

module.exports = (req, res) => {
  const { method } = req;
  
  // Handle different HTTP methods
  switch (method) {
    case 'GET':
      handleGet(req, res);
      break;
    case 'POST':
      handlePost(req, res);
      break;
    default:
      res.writeHead(405);
      res.end(JSON.stringify({ error: 'Method not allowed' }));
  }
};

function handleGet(req, res) {
  // Extract query parameters
  const { query } = new URL(req.url, `https://${req.headers.host}`);
  const params = querystring.parse(query);
  
  // Sample response (replace with real data)
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    endpoint: '/api/users',
    method: 'GET',
    params,
    data: [
      { id: 1, name: 'John Doe' },
      { id: 2, name: 'Jane Smith' }
    ]
  }));
}

function handlePost(req, res) {
  let body = [];
  
  req.on('data', chunk => body.push(chunk))
     .on('end', () => {
        body = Buffer.concat(body).toString();
        
        try {
          const data = JSON.parse(body);
          
          // Process data (save to database, etc.)
          console.log('Received user data:', data);
          
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'success',
            message: 'User created',
            data
          }));
        } catch (error) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
     });
}