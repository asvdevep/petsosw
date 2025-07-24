
exports.get= (req, res) => {
    const deviceId = new URL(req.url, `https://${req.headers.host}`).searchParams.get("id");
    if (!deviceId) return res.writeHead(400).end("Falta param id");

    const data = global.devData.get(deviceId);
    if (!data) return res.writeHead(404).end(`No hay registros para ${deviceId}`);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}