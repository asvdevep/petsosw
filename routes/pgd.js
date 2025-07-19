const fs = require('fs');
const path = require('path');

// Path to the JSON file where data will be stored
const DATA_FILE = path.join(__dirname, 'pgd_data.json');

// Ensure the data file exists (initialize with empty object if not)
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

module.exports = (req, res) => {
    const { method } = req;

    try {
        switch (method) {
            case 'GET':
                handleGet(req, res);
                break;
            case 'POST':
                handlePost(req, res);
                break;
            case 'DELETE':
                handleDelete(req, res);
                break;
            default:
                res.writeHead(405, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
    } catch (error) {
        console.error('Error in pgd handler:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
    }
};

// GET: Returns current data (or {})
function handleGet(req, res) {
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

function handlePost(req, res) {
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
}

// DELETE: Clears all data (resets to {})
function handleDelete(req, res) {
    fs.writeFile(DATA_FILE, JSON.stringify([]), (err) => {
        if (err) {
            console.error('Error clearing data file:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Internal server error' }));
        }
        res.writeHead(200);
        res.end();
    });
}