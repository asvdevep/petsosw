const https = require('https');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const PORT = process.env.HTTPS_PORT || 443;
const SSL_OPTIONS = {
  key: fs.readFileSync(path.resolve(process.env.SSL_KEY_PATH)),
  cert: fs.readFileSync(path.resolve(process.env.SSL_CERT_PATH)),
};

// Global state
const devices = new Map();
const activityLog = [];

// Create HTTPS server
const server = https.createServer(SSL_OPTIONS, (req, res) => {
  if (req.url === '/dashboard' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <head>
          <title>IoT Coordinator</title>
          <style>
            body { font-family: monospace; margin: 20px }
            .device { margin-bottom: 20px; border: 1px solid #ccc; padding: 10px }
            .coordinates { color: green }
            .commands { color: blue }
          </style>
        </head>
        <body>
          <h1>Connected Devices (${devices.size})</h1>
          ${Array.from(devices).map(([id]) => `
            <div class="device">
              <h2>${id}</h2>
              <div id="log-${id}"></div>
            </div>
          `).join('')}
          <script>
            const ws = new WebSocket('wss://' + window.location.host + '/monitor');
            ws.onmessage = (e) => {
              const data = JSON.parse(e.data);
              const logElement = document.getElementById('log-' + data.deviceId);
              if (logElement) {
                const entry = document.createElement('div');
                entry.className = data.type === 'coordinates' ? 'coordinates' : 'commands';
                entry.textContent = \`[\${new Date(data.timestamp).toLocaleTimeString()}] \${data.message}\`;
                logElement.appendChild(entry);
              }
            };
          </script>
        </body>
      </html>
    `);
    return;
  }
  res.writeHead(404).end();
});

// Main WebSocket Server for devices
const wss = new WebSocket.Server({ noServer: true });

// Monitor WebSocket Server for dashboard
const monitorWss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `https://${request.headers.host}`).pathname;

  if (pathname === '/ws/device') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else if (pathname === '/monitor') {
    monitorWss.handleUpgrade(request, socket, head, (ws) => {
      monitorWss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Device connections
wss.on('connection', (ws, req) => {
  const deviceId = new URL(req.url, `https://${req.headers.host}`).searchParams.get('id');
  if (!deviceId) return ws.close(4001, 'Device ID required');

  console.log(`Device connected: ${deviceId}`);
  devices.set(deviceId, ws);
  logActivity(deviceId, 'connection', 'Device connected');

  // Send welcome message
  ws.send(JSON.stringify({ 
    type: 'welcome',
    deviceId,
    timestamp: new Date().toISOString()
  }));

  ws.on('message', (data) => {
    try {
      const timestamp = new Date().toISOString();
      
      // Handle binary coordinates
      if (data instanceof Buffer && data.length === 5) {
        const coords = {
          lat: (data.readInt16BE(0) / 54000).toFixed(5),
          lon: (data.readInt16BE(2) / 54000).toFixed(5),
          flags: data.readUInt8(4)
        };
        const message = `Coordinates: Lat ${coords.lat}, Lon ${coords.lon}, Flags 0b${coords.flags.toString(2).padStart(8, '0')}`;
        console.log(`📍 ${deviceId}: ${message}`);
        logActivity(deviceId, 'coordinates', message);
        ws.send(Buffer.from([0x01])); // Send ACK
        return;
      }

      // Handle JSON messages
      const message = JSON.parse(data);
      console.log(`📩 ${deviceId}:`, message);
      logActivity(deviceId, 'message', JSON.stringify(message));
    } catch (err) {
      console.error('Error processing message:', err);
    }
  });

  ws.on('close', () => {
    console.log(`Device disconnected: ${deviceId}`);
    logActivity(deviceId, 'disconnection', 'Device disconnected');
    devices.delete(deviceId);
  });
});

// Broadcast activity to monitors
function logActivity(deviceId, type, message) {
  const entry = {
    deviceId,
    type,
    message,
    timestamp: new Date().toISOString()
  };
  activityLog.push(entry);
  
  monitorWss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(entry));
    }
  });
}

// Command line interface
function setupCLI() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\nIoT Coordinator Server');
  console.log('======================\n');

  function prompt() {
    rl.question('Command (list/send/help/exit): ', (input) => {
      const [command, ...args] = input.trim().split(' ');
      
      switch (command.toLowerCase()) {
        case 'list':
          console.log('\nConnected devices:');
          devices.forEach((ws, id) => {
            console.log(`- ${id} (${ws.readyState === 1 ? 'online' : 'offline'})`);
          });
          prompt();
          break;

        case 'send':
          if (args.length < 2) {
            console.log('Usage: send <deviceId> <command>');
            return prompt();
          }
          
          const [deviceId, cmd] = args;
          if (!devices.has(deviceId)) {
            console.log('Device not found');
            return prompt();
          }

          const cmdNum = parseInt(cmd);
          if (isNaN(cmdNum) ){
            console.log('Invalid command (must be number)');
            return prompt();
          }

          const buffer = Buffer.from([0xC0, cmdNum]);
          devices.get(deviceId).send(buffer);
          logActivity(deviceId, 'command', `Sent command: ${cmdNum}`);
          console.log(`Command ${cmdNum} sent to ${deviceId}`);
          prompt();
          break;

        case 'help':
          console.log('\nAvailable commands:');
          console.log('list       - Show connected devices');
          console.log('send <id> <cmd> - Send command to device');
          console.log('exit       - Shut down server');
          console.log('\nOpen https://localhost:${PORT}/dashboard in browser for live monitor');
          prompt();
          break;

        case 'exit':
          rl.close();
          process.exit(0);
          break;

        default:
          console.log('Unknown command. Type "help" for options.');
          prompt();
      }
    });
  }

  prompt();
}

// Start server
server.listen(PORT, () => {
  console.log(`
  🌐 Server running on https://localhost:${PORT}
  - Device endpoint: wss://localhost:${PORT}/ws/device?id=DEVICE_ID
  - Dashboard: https://localhost:${PORT}/dashboard
  `);
  setupCLI();
});