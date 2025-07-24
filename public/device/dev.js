// DOM Elements
const deviceIdInput = document.getElementById('deviceId');
const serverUrlInput = document.getElementById('serverUrl');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const connectionStatus = document.getElementById('connectionStatus');
const latitudeInput = document.getElementById('latitude');
const longitudeInput = document.getElementById('longitude');
const flagsSelect = document.getElementById('flags');
const sendDataBtn = document.getElementById('sendDataBtn');
const lastSentStatus = document.getElementById('lastSentStatus');
const pingBtn = document.getElementById('pingBtn');
const emergencyBtn = document.getElementById('emergencyBtn');
const receivedCommands = document.getElementById('receivedCommands');
const logElement = document.getElementById('log');

// WebSocket connection
let socket = null;

// Constants for binary communication
const COMMANDS = {
    ACK: 0x01,
    PING: 0x02,
    REQUEST_LOCATION: 0x03,
    EMERGENCY: 0x04
};

// Add message to log
function logMessage(message) {
    const timestamp = new Date().toISOString().slice(11, 19);
    logElement.innerHTML += `[${timestamp}] ${message}\n`;
    logElement.scrollTop = logElement.scrollHeight;
}

// Convert string to 4-byte ArrayBuffer
function stringTo4ByteBuffer(str) {
    const buf = new ArrayBuffer(4);
    const view = new DataView(buf);
    
    // Pad with zeros if shorter than 4 bytes
    const padded = str.padEnd(4, '\0').slice(0, 4);
    
    for (let i = 0; i < 4; i++) {
        view.setUint8(i, padded.charCodeAt(i));
    }
    
    return buf;
}

// Connect to WebSocket server
function connect() {
    const deviceId = deviceIdInput.value.trim();
    const serverUrl = serverUrlInput.value.trim();
    
    if (!deviceId) {
        alert('Please enter a device ID');
        return;
    }
    
    if (deviceId.length > 4) {
        alert('Device ID must be 4 bytes or less');
        return;
    }
    
    if (!serverUrl) {
        alert('Please enter a server URL');
        return;
    }
    
    const wsUrl = `${serverUrl}?id=${encodeURIComponent(deviceId)}`;
    
    logMessage(`Connecting to ${wsUrl}...`);
    
    try {
        socket = new WebSocket(wsUrl);
        
        socket.binaryType = 'arraybuffer';
        
        socket.onopen = () => {
            connectionStatus.textContent = 'Connected';
            connectionStatus.className = 'status connected';
            connectBtn.disabled = true;
            disconnectBtn.disabled = false;
            sendDataBtn.disabled = false;
            pingBtn.disabled = false;
            emergencyBtn.disabled = false;
            logMessage('WebSocket connection established (binary mode)');
        };
        
        socket.onclose = (event) => {
            connectionStatus.textContent = 'Disconnected';
            connectionStatus.className = 'status disconnected';
            connectBtn.disabled = false;
            disconnectBtn.disabled = true;
            sendDataBtn.disabled = true;
            pingBtn.disabled = true;
            emergencyBtn.disabled = true;
            
            if (event.wasClean) {
                logMessage(`Connection closed cleanly, code=${event.code}, reason=${event.reason}`);
            } else {
                logMessage('Connection died');
            }
        };
        
        socket.onerror = (error) => {
            logMessage(`WebSocket error: ${error.message}`);
        };
        
        socket.onmessage = (event) => {
            if (event.data instanceof ArrayBuffer) {
                const view = new DataView(event.data);
                const bytes = new Uint8Array(event.data);
                
                logMessage(`Received binary data: ${Array.from(bytes).map(b => '0x' + b.toString(16).padStart(2, '0')).join(', ')}`);
                
                if (event.data.byteLength === 1) {
                    const command = view.getUint8(0);
                    handleServerCommand(command);
                }
            } else {
                logMessage(`Received unexpected text data: ${event.data}`);
            }
        };
        
    } catch (error) {
        logMessage(`Connection error: ${error}`);
    }
}

// Handle commands from server
function handleServerCommand(command) {
    let commandName = 'Unknown';
    for (const [name, value] of Object.entries(COMMANDS)) {
        if (value === command) {
            commandName = name;
            break;
        }
    }
    
    receivedCommands.textContent = `Command received: ${commandName} (0x${command.toString(16).padStart(2, '0')})`;
    logMessage(`Received command: ${commandName}`);
    
    // Send ACK for any command except ACK itself
    if (command !== COMMANDS.ACK) {
        setTimeout(() => {
            const ackBuffer = new ArrayBuffer(1);
            const ackView = new DataView(ackBuffer);
            ackView.setUint8(0, COMMANDS.ACK);
            socket.send(ackBuffer);
            logMessage('Sent ACK (0x01)');
        }, 100);
    }
    
    // Auto-respond to certain commands
    if (command === COMMANDS.REQUEST_LOCATION) {
        setTimeout(sendLocationData, 500);
    }
}

// Disconnect from WebSocket server
function disconnect() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        logMessage('Closing connection...');
        socket.close(1000, 'User requested disconnect');
    }
}

// Send location data to server (5 bytes)
function sendLocationData() {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        alert('Not connected to server');
        return;
    }
    
    try {
        const lat = parseFloat(latitudeInput.value);
        const lon = parseFloat(longitudeInput.value);
        const flags = parseInt(flagsSelect.value);
        
        if (isNaN(lat) || isNaN(lon)) {
            alert('Invalid coordinates');
            return;
        }
        
        // Create buffer with 5 bytes (2 bytes lat, 2 bytes lon, 1 byte flags)
        const buffer = new ArrayBuffer(5);
        const view = new DataView(buffer);
        
        // Convert coordinates to fixed-point representation (as in your server)
        const scaledLat = Math.round(lat * 54000);
        const scaledLon = Math.round(lon * 54000);
        
        view.setInt16(0, scaledLat, false); // Big-endian
        view.setInt16(2, scaledLon, false); // Big-endian
        view.setUint8(4, flags);
        
        socket.send(buffer);
        
        const timestamp = new Date().toLocaleTimeString();
        lastSentStatus.textContent = `Last sent: ${timestamp} - Lat: ${lat}, Lon: ${lon}, Flags: 0x${flags.toString(16).padStart(2, '0')}`;
        logMessage(`Sent location data (5 bytes): Lat=${lat}, Lon=${lon}, Flags=0x${flags.toString(16).padStart(2, '0')}`);
    } catch (error) {
        logMessage(`Error sending location data: ${error}`);
    }
}

// Send ping command (1 byte)
function sendPing() {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        alert('Not connected to server');
        return;
    }
    
    const buffer = new ArrayBuffer(1);
    const view = new DataView(buffer);
    view.setUint8(0, COMMANDS.PING);
    
    socket.send(buffer);
    logMessage('Sent PING command (0x02)');
}

// Send emergency signal (1 byte)
function sendEmergency() {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        alert('Not connected to server');
        return;
    }
    
    const buffer = new ArrayBuffer(1);
    const view = new DataView(buffer);
    view.setUint8(0, COMMANDS.EMERGENCY);
    
    socket.send(buffer);
    logMessage('Sent EMERGENCY command (0x04)');
}

// Event listeners
connectBtn.addEventListener('click', connect);
disconnectBtn.addEventListener('click', disconnect);
sendDataBtn.addEventListener('click', sendLocationData);
pingBtn.addEventListener('click', sendPing);
emergencyBtn.addEventListener('click', sendEmergency);

// Initialize
logMessage('Device simulator ready (binary mode)');