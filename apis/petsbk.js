const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'pets.json');

// Ensure the data file exists (initialize with empty object if not)
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}


exports.get= (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading data file:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Internal server error' }));
        }

        try {
            const jsonData = data ? JSON.parse(data) : {};
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(jsonData));
        } catch (parseError) {
            console.error('Error parsing data file:', parseError);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({}));
        }
    });
}

// routes/products.js
exports.sgets = (req, res) => {
  // Endpoint-specific logic
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      endpoint: "/api/pets",
      data: [
        { id: 1, name: "Ramirito" },
        { id: 2, name: "Chepoturca" },
        { id: 3, name: "Cachu" },
        { id: 4, name: "Mona" },
      ],
    })
  );
};


// post
exports.post = (req, res) => {
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', () => {
        try {
            const newEntry = JSON.parse(body);
            // Add timestamp to the entry
            newEntry.creado = new Date().toISOString(); // ISO format (e.g., "2023-11-20T12:34:56.789Z")

            fs.readFile(DATA_FILE, 'utf8', (readErr, fileData) => {
                if (readErr) {
                    console.error('Error reading data file:', readErr);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Internal server error' }));
                }

                try {
                    const existingData = fileData ? JSON.parse(fileData) : [];
                    existingData.push(newEntry); // Append the new entry (with timestamp)

                    fs.writeFile(DATA_FILE, JSON.stringify(existingData, null, 2), (writeErr) => {
                        if (writeErr) {
                            console.error('Error writing to data file:', writeErr);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            return res.end(JSON.stringify({ error: 'Internal server error' }));
                        }
                        res.writeHead(200);
                        res.end();
                    });
                } catch (parseError) {
                    console.error('Error parsing existing data:', parseError);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Internal server error' }));
                }
            });
        } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON data' }));
        }
    });
};