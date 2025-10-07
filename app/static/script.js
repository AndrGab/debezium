// Global variables
let client_id = Date.now();
let ws;
let messageCount = 0;
let isConnected = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeWebSocket();
    setupEventListeners();
    updateConnectionStatus('connecting', 'Connecting...');
});

// WebSocket connection management
function initializeWebSocket() {
    document.querySelector("#ws-id").textContent = client_id;
    ws = new WebSocket(`ws://localhost:8000/ws/${client_id}`);
    
    ws.onopen = function(event) {
        isConnected = true;
        updateConnectionStatus('connected', 'Connected');
        addSystemMessage('Connected to Debezium Real-Time Chat! 🚀');
    };
    
    ws.onmessage = function(event) {
        handleIncomingMessage(event.data);
    };
    
    ws.onclose = function(event) {
        isConnected = false;
        updateConnectionStatus('disconnected', 'Disconnected');
        addSystemMessage('Connection lost. Attempting to reconnect...');
        setTimeout(initializeWebSocket, 3000);
    };
    
    ws.onerror = function(error) {
        updateConnectionStatus('disconnected', 'Connection Error');
        console.error('WebSocket error:', error);
    };
}

// Event listeners setup
function setupEventListeners() {
    const messageInput = document.getElementById("messageText");
    const charCount = document.getElementById("char-count");
    
    // Character counter
    messageInput.addEventListener('input', function() {
        charCount.textContent = this.value.length;
    });
    
    // Auto-resize input
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(event) {
        if (event.ctrlKey && event.key === 'Enter') {
            sendMessage(event);
        }
    });
}

// Connection status management
function updateConnectionStatus(status, text) {
    const statusIndicator = document.getElementById("connection-status");
    const connectionText = document.getElementById("connection-text");
    
    statusIndicator.className = `status-indicator ${status}`;
    connectionText.textContent = text;
}

// Handle incoming messages
function handleIncomingMessage(messageData) {
    const messagesContainer = document.getElementById("messages");
    const messageElement = createMessageElement(messageData);
    
    // Remove welcome message if it exists
    const welcomeMessage = messagesContainer.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }
    
    messagesContainer.insertBefore(messageElement, messagesContainer.firstChild);
    messageCount++;
    updateMessageCount();
    
    // Auto-scroll to top for new messages
    messagesContainer.scrollTop = 0;
}

// Create message element
function createMessageElement(messageData) {
    const messageDiv = document.createElement("div");
    messageDiv.className = "message-item";
    
    // Determine message type and styling
    let messageType = 'cdc';
    let typeLabel = 'CDC';
    
    if (messageData.includes("Created")) {
        messageType = 'create';
        typeLabel = 'CREATE';
    } else if (messageData.includes("Updated")) {
        messageType = 'update';
        typeLabel = 'UPDATE';
    } else if (messageData.includes("Deleted")) {
        messageType = 'delete';
        typeLabel = 'DELETE';
    }
    
    messageDiv.classList.add(messageType);
    
    // Create message content
    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";
    contentDiv.textContent = messageData;
    
    // Create message metadata
    const metaDiv = document.createElement("div");
    metaDiv.className = "message-meta";
    
    const typeSpan = document.createElement("span");
    typeSpan.className = `message-type ${messageType}`;
    typeSpan.textContent = typeLabel;
    
    const timeSpan = document.createElement("span");
    timeSpan.textContent = new Date().toLocaleTimeString();
    
    metaDiv.appendChild(typeSpan);
    metaDiv.appendChild(timeSpan);
    
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(metaDiv);
    
    return messageDiv;
}

// Add system messages
function addSystemMessage(text) {
    const messagesContainer = document.getElementById("messages");
    const messageDiv = document.createElement("div");
    messageDiv.className = "message-item cdc";
    
    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";
    contentDiv.textContent = `🔔 ${text}`;
    
    const metaDiv = document.createElement("div");
    metaDiv.className = "message-meta";
    metaDiv.innerHTML = `<span class="message-type create">SYSTEM</span><span>${new Date().toLocaleTimeString()}</span>`;
    
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(metaDiv);
    
    messagesContainer.insertBefore(messageDiv, messagesContainer.firstChild);
}

// Update message count
function updateMessageCount() {
    const countElement = document.getElementById("message-count");
    countElement.textContent = messageCount;
}

// Send message function
function sendMessage(event) {
    const input = document.getElementById("messageText");
    const message = input.value.trim();
    
    if (message !== "" && isConnected) {
        ws.send(message);
        input.value = "";
        document.getElementById("char-count").textContent = "0";
        
        // Add user message to UI
        addUserMessage(message);
    } else if (!isConnected) {
        addSystemMessage("Cannot send message: Not connected to server");
    }
    
    event.preventDefault();
}

// Add user message to UI
function addUserMessage(message) {
    const messagesContainer = document.getElementById("messages");
    const messageDiv = document.createElement("div");
    messageDiv.className = "message-item";
    
    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";
    contentDiv.textContent = `👤 You: ${message}`;
    
    const metaDiv = document.createElement("div");
    metaDiv.className = "message-meta";
    metaDiv.innerHTML = `<span class="message-type update">USER</span><span>${new Date().toLocaleTimeString()}</span>`;
    
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(metaDiv);
    
    messagesContainer.insertBefore(messageDiv, messagesContainer.firstChild);
}

// Sample data functions for sidebar buttons
function insertSampleData() {
    const sampleQueries = [
        "INSERT INTO super_heroes (name, secret_identity, powers) VALUES ('Batman', 'Bruce Wayne', 'intelligence, martial arts');",
        "INSERT INTO super_heroes (name, secret_identity, powers) VALUES ('Wonder Woman', 'Diana Prince', 'super strength, flight, combat');",
        "INSERT INTO super_heroes (name, secret_identity, powers) VALUES ('Spider-Man', 'Peter Parker', 'wall-crawling, spider-sense, agility');"
    ];
    
    const randomQuery = sampleQueries[Math.floor(Math.random() * sampleQueries.length)];
    addSystemMessage(`Try this SQL command: ${randomQuery}`);
}

function updateSampleData() {
    const sampleQueries = [
        "UPDATE super_heroes SET powers = 'enhanced strength, flight, combat, leadership' WHERE name = 'Wonder Woman';",
        "UPDATE super_heroes SET secret_identity = 'Miles Morales' WHERE name = 'Spider-Man';",
        "UPDATE super_heroes SET powers = 'intelligence, martial arts, detective skills, gadgets' WHERE name = 'Batman';"
    ];
    
    const randomQuery = sampleQueries[Math.floor(Math.random() * sampleQueries.length)];
    addSystemMessage(`Try this SQL command: ${randomQuery}`);
}

function deleteSampleData() {
    const sampleQueries = [
        "DELETE FROM super_heroes WHERE name = 'Batman';",
        "DELETE FROM super_heroes WHERE secret_identity = 'Bruce Wayne';",
        "DELETE FROM super_heroes WHERE powers LIKE '%flight%';"
    ];
    
    const randomQuery = sampleQueries[Math.floor(Math.random() * sampleQueries.length)];
    addSystemMessage(`Try this SQL command: ${randomQuery}`);
}

// Utility functions
function formatJSON(jsonString) {
    try {
        return JSON.stringify(JSON.parse(jsonString), null, 2);
    } catch (e) {
        return jsonString;
    }
}

// Export functions for global access
window.insertSampleData = insertSampleData;
window.updateSampleData = updateSampleData;
window.deleteSampleData = deleteSampleData;
window.sendMessage = sendMessage;

// ========================================================
// Debezium Event Feed UI Script — Rickveloper Edition
// ========================================================

const container = document.getElementById('messages');

/**
 * Add a message/event to the feed
 * @param {string} type - Event type (insert, update, delete)
 * @param {string} text - Text content for the message
 */
function addMsg(type, text) {
  const el = document.createElement('div');
  el.className = 'message ' + type;

  const time = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  el.innerHTML = `<span>${text}</span><div class="time">${time}</div>`;

  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

/* --- Demo Calls (can remove later) --- */
addMsg('insert', 'New record added: Batman 🦇');
addMsg('update', 'Updated user email field');
addMsg('delete', 'Deleted old log entry');
