exports.post = (req, res) => {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", () => {
    try {
      const { device, cmd } = JSON.parse(body);

      //const type = typeof cmd;
      let chktype = "";

      switch (typeof cmd) {
        case "number":
          if (cmd > 31) chktype = "cmd debe ser menor a 31";
          break;
        case "undefined":
          chktype = "cmd es requerido";
          break;
        default:
          chktype = "cmd debe ser numerico";
      }

      if (chktype !== "")
        return res.writeHead(400).end(
          JSON.stringify({
            error: chktype,
          })
        );

      if (!device) {
        return res.writeHead(400).end(
          JSON.stringify({
            error: "device es requerido",
          })
        );
      }

      if (!global.devices.has(device)) {
        // Check if device is connected
        return res.writeHead(404).end(
          JSON.stringify({
            error: "Pet no conectado",
          })
        );
      }

      // conexion ws
      const ws = global.devices.get(device);

      const messageBuffer = Buffer.from([cmd]); //--> Lo que se envia al server
      ws.send(messageBuffer, (err) => {
        if (err) {
          console.error(`Error sending cmd to ${device}:`, err);
          return res.writeHead(500).end(
            JSON.stringify({
              error: "Error envio",
            })
          );
        }

        if (cmd == 4) {
          ws.close(1000, "Cierra");
        }

        const now = new Date();
        now.setHours(now.getHours() - 6);
        const hora = now.toISOString();

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            hora: hora,
            cmd: cmd,
            env:"✔"
          })
        );
      });
    } catch (error) {
      console.error("Error processing request:", error);
      res.writeHead(500).end(
        JSON.stringify({
          error: "Internal server error",
        })
      );
    }
  });
};
