const https = require("https");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const url = require("url");

// ======================
// 1. CONFIGURATION
// ======================
const sslOptions = {
  key: fs.readFileSync(path.resolve(process.env.SSL_KEY_PATH)),
  cert: fs.readFileSync(path.resolve(process.env.SSL_CERT_PATH)),
};
const PORT = process.env.HTTPS_PORT || 443;
const PUBLIC_DIR = path.join(__dirname, "public");

// ======================
// 2. GLOBALS
// ======================
global.devices = new Map(); // Stores connected WebSocket devices
global.devData = new Map(); // Stores data from devices

// ======================
// 3. DYNAMIC API LOADER
// ======================
const apiHandlers = {};

fs.readdirSync(path.join(__dirname, "apis"))
  .filter((file) => file.endsWith(".js"))
  .forEach((file) => {
    const apiName = file.replace(".js", "");
    apiHandlers[apiName] = require(`./apis/${file}`);
    console.log(`🌀 Loaded API: /api/${apiName}`);
  });

// ======================
// 4. STATIC FILE SERVER
// ======================
const serveStaticFiles = (req, res) => {
  // 1. Parse URL safely
  const baseURL = `https://${req.headers.host}/`;
  const parsedUrl = new URL(req.url, baseURL);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // 2. Resolve file path
  let filePath = path.join(PUBLIC_DIR, pathname);
  if (filePath.endsWith("/")) filePath += "index.html";

  // 3. Security check
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  // 4. Serve file
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPAs
      const fallback = path.join(PUBLIC_DIR, "index.html");
      return fs.readFile(fallback, (err, data) => {
        if (err) res.writeHead(404).end("Not Found");
        else res.writeHead(200, { "Content-Type": "text/html" }).end(data);
      });
    }

    // Determine content type
    const ext = path.extname(filePath);
    const mimeTypes = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon",
    };

    fs.readFile(filePath, (err, data) => {
      if (err) res.writeHead(500).end("Server Error");
      else
        res
          .writeHead(200, {
            "Content-Type": mimeTypes[ext] || "application/octet-stream",
          })
          .end(data);
    });
  });
};

// ======================
// 5. REQUEST HANDLER
// ======================
function handleRequest(req, res) {
  const { pathname } = url.parse(req.url, true);
  const method = req.method.toLowerCase();

  // API Routes
  if (pathname.startsWith("/api/")) {
    const endpoint = pathname.split("/")[2];

    if (endpoint && apiHandlers[endpoint]) {
      const handler = apiHandlers[endpoint][method];
      if (typeof handler === "function") {
        return handler(req, res);
      }
      return res.writeHead(405).end("Method Not Allowed");
    }
    return res.writeHead(404).end("API Not Found");
  }

  // Static Files
  serveStaticFiles(req, res);
}

// ======================
// 6. WEBSOCKET SERVER
// ======================
const server = https.createServer(sslOptions, handleRequest);
const wss = new WebSocket.Server({ noServer: true });

wss.on("connection", (ws, req) => {

  var deviceId;
//  ws.send(Buffer.from([0x01]));

  ws.on("message", (data) => {

    const now = new Date();
    now.setHours(now.getHours() - 6); 
    console.log(data.length,data);

    if (data.length === 4 && !deviceId) {
      deviceId=Buffer.from(data, 'binary').toString('hex');
      global.devices.set(deviceId, ws);
       ws.send(Buffer.from([0x01])); // ACK 01= deviceId registrado
    }
    else if (!deviceId) {
      ws.send(Buffer.from([0x00])); // excp 00=deviceID no registrado
    }
    else if (data.length ===2) {  // Comando
      console.log(`📍 Command from ${deviceId}:`, data);
      ws.send(Buffer.from([0x01])); // ACK 11= Comando Recibido
    }
    else if (data.length === 6) {  // Coordenadas
      const locationData = {
      //  lat: data.readInt16BE(0) / 54000,
      //  lon: data.readInt16BE(2) / 54000,
      //  flags: data.readUInt8(4),
        device:deviceId,
        donde:Buffer.from(data, 'binary').toString('hex'),
        hora:  now.toISOString(),
      };
      global.devData.set(deviceId, locationData);
      console.log(`📍 Data from ${deviceId}:`, locationData);
      ws.send(Buffer.from([0x21])); // ACK 21= Coords recibidas
    } else {
       ws.send(Buffer.from([0x10])); // excp 10= Mensaje no identificado
    }


  });

  ws.on("close", () => {
    console.log(`❌ Device disconnected: ${deviceId}`);
    global.devices.delete(deviceId);
    global.devData.delete(deviceId);
  });
});

server.on("upgrade", (req, socket, head) => {
  const pathname = new URL(req.url, `https://${req.headers.host}`).pathname;

  if (pathname === "/ws/device") {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  } else {
    socket.destroy();
  }
});

// ======================
// 7. START SERVER
// ======================
server.listen(PORT, () => {
  console.log(`
  🚀 Server running at:
  - HTTPS: https://localhost:${PORT}
  - WebSocket: wss://localhost:${PORT}/ws/device?id=DEVICE_ID
  - APIs: /api/*
  - Static files: / (served from /public)
  `);
});
