// routes/products.js
module.exports = (req, res) => {
  // Endpoint-specific logic
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    endpoint: '/api/products',
    data: [
      { id: 101, name: 'Product A' },
      { id: 102, name: 'Product B' }
    ]
  }));
};