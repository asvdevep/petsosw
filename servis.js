const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url"); // ← Missing import
const routeHandler = require("./routes");

// SSL Configuration
const sslOptions = {
  key: fs.readFileSync(path.resolve(process.env.SSL_KEY_PATH)),
  cert: fs.readFileSync(path.resolve(process.env.SSL_CERT_PATH)),
};

// HTTPS Server
const server = https.createServer(sslOptions, (req, res) => {
  const { pathname } = new URL(req.url, `https://${req.headers.host}`);

  // API Routes
  if (pathname.startsWith("/api/")) {
    return routeHandler(req, res);
  }

  // Serve Static Files
  serveStaticFiles(req, res);
});

// Handle static files
function serveStaticFiles(req, res) {
  const parsedUrl = url.parse(req.url);
  let pathname = path.join(__dirname, "public", parsedUrl.pathname); // Serve from /public

  // Default to index.html
  if (pathname.endsWith("/")) {
    pathname = path.join(pathname, "index.html");
  }

  // Security: Prevent directory traversal
  if (!pathname.startsWith(path.join(__dirname, "public"))) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  fs.readFile(pathname, (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        // Fallback to index.html for SPA (React/Angular/Vue)
        if (req.url.startsWith("/api")) {
          res.writeHead(404).end("Not Found");
        } else {
          fs.readFile(path.join(__dirname, "public", "index.html"), (err, data) => {
            if (err) {
              res.writeHead(500).end("Server Error");
            } else {
              res.writeHead(200, { "Content-Type": "text/html" }).end(data);
            }
          });
        }
      } else {
        res.writeHead(500).end("Server Error");
      }
      return;
    }

    const ext = path.extname(pathname);
    res.writeHead(200, { "Content-Type": getContentType(ext) }).end(data);
  });
}

function getContentType(ext) {
  const mimeTypes = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".ico": "image/x-icon",
    ".svg": "image/svg+xml",
  };
  return mimeTypes[ext] || "text/plain";
}

// Start HTTPS Server
server.listen(process.env.HTTPS_PORT, () => {
  console.log(`HTTPS Server running on https://localhost:${process.env.HTTPS_PORT}`);
});

//Optional: Redirect HTTP to HTTPS
http.createServer((req, res) => {
  res.writeHead(301, { "Location": `https://${req.headers.host}${req.url}` });
  res.end();
}).listen(process.env.HTTP_PORT, () => {
  console.log(`HTTP Redirect running on http://localhost:${process.env.HTTP_PORT}`);
});