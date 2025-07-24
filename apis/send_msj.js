
module.exports = {
  post: (req, res) => {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const { deviceId, message } = JSON.parse(body);
        
        if (!deviceId || !message) {
          return res.writeHead(400).end(JSON.stringify({
            error: 'Both deviceId and message are required'
          }));
        }

        // Check if device is connected
        if (!global.devices.has(deviceId)) {
          return res.writeHead(404).end(JSON.stringify({
            error: 'Device not connected'
          }));
        }

        // Get the WebSocket connection
        const ws = global.devices.get(deviceId);

        // Send the message (convert string to Buffer if needed)
        const messageBuffer = Buffer.isBuffer(message) ? message : Buffer.from(message);
        ws.send(messageBuffer, (err) => {
          if (err) {
            console.error(`Error sending message to ${deviceId}:`, err);
            return res.writeHead(500).end(JSON.stringify({
              error: 'Failed to send message'
            }));
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            message: 'Message sent successfully'
          }));
        });
      } catch (error) {
        console.error('Error processing request:', error);
        res.writeHead(500).end(JSON.stringify({
          error: 'Internal server error'
        }));
      }
    });
  }
};