// Global variables
let client_id = Date.now();
let ws;
let messageCount = 0;
let isConnected = false;
let nickname = null;
let nicknameAccepted = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    setupNicknameModal();
    updateConnectionStatus('connecting', 'Connecting...');
    
    // Check for saved nickname in localStorage
    const savedNickname = localStorage.getItem('chatNickname');
    if (savedNickname) {
        nickname = savedNickname;
        // Try to connect with saved nickname
        initializeWebSocket();
    } else {
        // Show modal if no saved nickname
        showNicknameModal();
    }
});

// Nickname Modal Management
function showNicknameModal() {
    const modal = document.getElementById('nickname-modal');
    modal.classList.remove('hidden');
    const input = document.getElementById('nickname-input');
    setTimeout(() => input.focus(), 100);
}

function hideNicknameModal() {
    const modal = document.getElementById('nickname-modal');
    modal.classList.add('hidden');
}

function setupNicknameModal() {
    const input = document.getElementById('nickname-input');
    const submitBtn = document.getElementById('nickname-submit');
    const charCount = document.getElementById('nickname-char-count');
    const errorDiv = document.getElementById('nickname-error');
    
    // Character counter
    input.addEventListener('input', function() {
        charCount.textContent = this.value.length;
        errorDiv.textContent = ''; // Clear error on input
    });
    
    // Submit on Enter key
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            submitBtn.click();
        }
    });
    
    // Submit button
    submitBtn.addEventListener('click', function() {
        const nicknameValue = input.value.trim();
        
        // Client-side validation
        if (!nicknameValue) {
            errorDiv.textContent = 'Nickname cannot be empty';
            return;
        }
        
        if (nicknameValue.length < 3) {
            errorDiv.textContent = 'Nickname must be at least 3 characters';
            return;
        }
        
        if (nicknameValue.length > 20) {
            errorDiv.textContent = 'Nickname cannot exceed 20 characters';
            return;
        }
        
        if (!/^[a-zA-Z0-9_]+$/.test(nicknameValue)) {
            errorDiv.textContent = 'Only letters, numbers, and underscores allowed';
            return;
        }
        
        // Disable button while connecting
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Connecting...</span>';
        
        nickname = nicknameValue;
        initializeWebSocket();
    });
}

// WebSocket connection management
function initializeWebSocket() {
    ws = new WebSocket(`ws://localhost:8000/ws/${client_id}`);
    
    ws.onopen = function(event) {
        isConnected = true;
        updateConnectionStatus('connected', 'Connected');
        
        // Send nickname as first message
        if (nickname && !nicknameAccepted) {
            ws.send(`NICKNAME:${nickname}`);
        }
    };
    
    ws.onmessage = function(event) {
        const data = event.data;
        
        // Handle nickname acceptance/rejection
        if (data.startsWith('NICKNAME_ACCEPTED:')) {
            nicknameAccepted = true;
            const acceptedNickname = data.replace('NICKNAME_ACCEPTED:', '');
            document.querySelector("#ws-id").textContent = acceptedNickname;
            
            // Save nickname to localStorage on successful acceptance
            localStorage.setItem('chatNickname', acceptedNickname);
            
            hideNicknameModal();
            addSystemMessage('Connected to Debezium Real-Time Chat! 🚀');
            return;
        }
        
        if (data.startsWith('NICKNAME_ERROR:')) {
            const error = data.replace('NICKNAME_ERROR:', '');
            const errorDiv = document.getElementById('nickname-error');
            const submitBtn = document.getElementById('nickname-submit');
            
            errorDiv.textContent = error;
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check"></i><span>Join Chat</span>';
            
            // If saved nickname was rejected, clear it and show modal
            localStorage.removeItem('chatNickname');
            showNicknameModal();
            
            // Close websocket and reset
            ws.close();
            isConnected = false;
            nicknameAccepted = false;
            updateConnectionStatus('disconnected', 'Nickname rejected');
            return;
        }
        
        // Handle regular messages
        handleIncomingMessage(data);
    };
    
    ws.onclose = function(event) {
        isConnected = false;
        updateConnectionStatus('disconnected', 'Disconnected');
        
        if (nicknameAccepted) {
            addSystemMessage('Connection lost. Attempting to reconnect...');
            // Reset for reconnection
            nicknameAccepted = false;
            setTimeout(() => {
                showNicknameModal();
            }, 3000);
        }
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
    
    // Change nickname button
    const changeNicknameBtn = document.getElementById('change-nickname-btn');
    if (changeNicknameBtn) {
        changeNicknameBtn.addEventListener('click', function() {
            changeNickname();
        });
    }
}

// Change nickname function
function changeNickname() {
    if (confirm('Are you sure you want to change your nickname? You will need to reconnect.')) {
        // Clear saved nickname
        localStorage.removeItem('chatNickname');
        
        // Close current connection
        if (ws) {
            ws.close();
        }
        
        // Reset state
        isConnected = false;
        nicknameAccepted = false;
        nickname = null;
        
        // Show modal
        showNicknameModal();
        
        // Clear the input
        const input = document.getElementById('nickname-input');
        if (input) {
            input.value = '';
            document.getElementById('nickname-char-count').textContent = '0';
        }
        
        updateConnectionStatus('disconnected', 'Disconnected');
    }
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
    
    if (!nicknameAccepted) {
        addSystemMessage("Please set your nickname first");
        event.preventDefault();
        return;
    }
    
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
    contentDiv.textContent = `👤 ${nickname}: ${message}`;
    
    const metaDiv = document.createElement("div");
    metaDiv.className = "message-meta";
    metaDiv.innerHTML = `<span class="message-type update">YOU</span><span>${new Date().toLocaleTimeString()}</span>`;
    
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
window.changeNickname = changeNickname;
