// GET /api/devices
exports.get = (req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      device: Array.from(global.devData.keys()),
      loc: Array.from(global.devData.values()),
      //status: 'active'
    })
  );
};

// POST /api/devices/command
exports.post = (req, res) => {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    try {
      const { deviceId, command } = JSON.parse(body);
      const device = global.devices.get(deviceId);

      if (device) {
        device.send(Buffer.from([0xc0, command]));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "command_sent" }));
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Device offline" }));
      }
    } catch (e) {
      res.writeHead(400);
      res.end("Invalid request format");
    }
  });
};
