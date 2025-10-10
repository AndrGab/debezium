// Global variables
let client_id = Date.now();
let ws;
let messageCount = 0;
let isConnected = false;
let currentNickname = null;
let cdcActivityChart = null;
let metricsUpdateInterval = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    showNicknameModal();
    updateConnectionStatus('connecting', 'Waiting for nickname...');
    initializeDashboard();
});

// Nickname Modal Functions
function showNicknameModal() {
    const modal = document.getElementById('nickname-modal');
    modal.classList.remove('hidden');
    
    // Focus on input
    setTimeout(() => {
        document.getElementById('nickname-input').focus();
    }, 100);
}

function hideNicknameModal() {
    const modal = document.getElementById('nickname-modal');
    modal.classList.add('hidden');
}

function validateNickname(nickname) {
    const trimmed = nickname.trim();
    
    if (trimmed.length === 0) {
        return { valid: false, error: 'Nickname cannot be empty' };
    }
    
    if (trimmed.length < 2) {
        return { valid: false, error: 'Nickname must be at least 2 characters' };
    }
    
    if (trimmed.length > 20) {
        return { valid: false, error: 'Nickname must be 20 characters or less' };
    }
    
    // Allow alphanumeric, spaces, underscores, and hyphens
    const regex = /^[a-zA-Z0-9_ -]+$/;
    if (!regex.test(trimmed)) {
        return { valid: false, error: 'Only letters, numbers, spaces, _ and - allowed' };
    }
    
    return { valid: true, nickname: trimmed };
}

function submitNickname(event) {
    event.preventDefault();
    
    const input = document.getElementById('nickname-input');
    const errorDiv = document.getElementById('nickname-error');
    const nickname = input.value;
    
    // Validate nickname
    const validation = validateNickname(nickname);
    
    if (!validation.valid) {
        errorDiv.textContent = validation.error;
        errorDiv.classList.add('show');
        input.focus();
        return;
    }
    
    // Hide error if any
    errorDiv.classList.remove('show');
    
    // Store nickname and connect
    currentNickname = validation.nickname;
    document.getElementById('nickname-display').textContent = currentNickname;
    
    hideNicknameModal();
    initializeWebSocket();
}

function editNickname() {
    // Disconnect current WebSocket
    if (ws && isConnected) {
        ws.close();
    }
    
    // Clear current nickname
    currentNickname = null;
    document.getElementById('nickname-input').value = '';
    document.getElementById('nickname-char-count').textContent = '0';
    
    // Show modal again
    showNicknameModal();
    updateConnectionStatus('connecting', 'Waiting for nickname...');
}

// WebSocket connection management
function initializeWebSocket() {
    if (!currentNickname) {
        showNicknameModal();
        return;
    }
    
    updateConnectionStatus('connecting', 'Connecting...');
    
    // Include nickname as query parameter
    ws = new WebSocket(`ws://localhost:8000/ws/${client_id}?nickname=${encodeURIComponent(currentNickname)}`);
    
    ws.onopen = function(event) {
        isConnected = true;
        updateConnectionStatus('connected', 'Connected');
        addSystemMessage(`Connected to Debezium Real-Time Chat! 🚀`);
    };
    
    ws.onmessage = function(event) {
        handleIncomingMessage(event.data);
    };
    
    ws.onclose = function(event) {
        isConnected = false;
        updateConnectionStatus('disconnected', 'Disconnected');
        
        // Check if close was due to nickname error
        if (event.code === 1008) {
            addSystemMessage(`❌ ${event.reason}`);
            showNicknameModal();
            const errorDiv = document.getElementById('nickname-error');
            errorDiv.textContent = event.reason;
            errorDiv.classList.add('show');
        } else {
            addSystemMessage('Connection lost. Attempting to reconnect...');
            setTimeout(initializeWebSocket, 3000);
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
    
    // Character counter for message input
    messageInput.addEventListener('input', function() {
        charCount.textContent = this.value.length;
    });
    
    // Character counter for nickname input
    const nicknameInput = document.getElementById("nickname-input");
    const nicknameCharCount = document.getElementById("nickname-char-count");
    
    nicknameInput.addEventListener('input', function() {
        nicknameCharCount.textContent = this.value.length;
        // Clear error on input
        const errorDiv = document.getElementById('nickname-error');
        errorDiv.classList.remove('show');
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

    // Determine message type and label
    let messageType = 'cdc';
    let typeLabel = 'CDC EVENT';
    
    if (messageData.includes("Created") || messageData.includes("INSERT")) {
        messageType = 'create';
        typeLabel = 'CREATE';
    } else if (messageData.includes("Updated") || messageData.includes("UPDATE")) {
        messageType = 'update';
        typeLabel = 'UPDATE';
    } else if (messageData.includes("Deleted") || messageData.includes("DELETE")) {
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
    contentDiv.textContent = `👤 ${currentNickname || 'You'}: ${message}`;
    
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
window.submitNickname = submitNickname;
window.editNickname = editNickname;
window.switchTab = switchTab;

// ========================================
// DASHBOARD FUNCTIONALITY
// ========================================

function switchTab(tabName) {
    // Update tab buttons
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        if (tab.textContent.toLowerCase().includes(tabName)) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Update tab content
    const messagesTab = document.getElementById('messages-tab');
    const dashboardTab = document.getElementById('dashboard-tab');
    
    if (tabName === 'messages') {
        messagesTab.classList.add('active');
        dashboardTab.classList.remove('active');
        
        // Stop metrics updates when leaving dashboard
        if (metricsUpdateInterval) {
            clearInterval(metricsUpdateInterval);
            metricsUpdateInterval = null;
        }
    } else if (tabName === 'dashboard') {
        messagesTab.classList.remove('active');
        dashboardTab.classList.add('active');
        
        // Start metrics updates when entering dashboard
        updateMetrics();
        metricsUpdateInterval = setInterval(updateMetrics, 2000); // Update every 2 seconds
    }
}

function initializeDashboard() {
    // Initialize CDC Activity Chart
    const ctx = document.getElementById('cdcActivityChart');
    if (ctx) {
        cdcActivityChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Create',
                        data: [],
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Update',
                        data: [],
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Delete',
                        data: [],
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }
}

async function updateMetrics() {
    try {
        const response = await fetch('/ws/metrics');
        const metrics = await response.json();
        
        // Update metric cards
        document.getElementById('metric-users').textContent = metrics.connected_users;
        document.getElementById('metric-msg-min').textContent = metrics.messages_per_minute;
        document.getElementById('metric-topics').textContent = metrics.kafka_topics || 0;
        
        // Update throughput metrics
        document.getElementById('metric-cdc-rate').textContent = metrics.cdc_events_per_sec || 0;
        
        // Format bytes per second with units
        const bytesPerSec = metrics.bytes_per_sec || 0;
        let formattedBytes;
        if (bytesPerSec < 1024) {
            formattedBytes = bytesPerSec.toFixed(0) + ' B/s';
        } else if (bytesPerSec < 1024 * 1024) {
            formattedBytes = (bytesPerSec / 1024).toFixed(2) + ' KB/s';
        } else {
            formattedBytes = (bytesPerSec / (1024 * 1024)).toFixed(2) + ' MB/s';
        }
        document.getElementById('metric-bytes-rate').textContent = formattedBytes;
        
        // Update operation distribution with percentage-based fill
        const total24h = metrics.events_24h.create + metrics.events_24h.update + metrics.events_24h.delete;
        
        if (total24h > 0) {
            // Calculate percentage of total operations
            const createPercent = (metrics.events_24h.create / total24h) * 100;
            const updatePercent = (metrics.events_24h.update / total24h) * 100;
            const deletePercent = (metrics.events_24h.delete / total24h) * 100;
            
            document.getElementById('op-create-bar').style.width = createPercent + '%';
            document.getElementById('op-update-bar').style.width = updatePercent + '%';
            document.getElementById('op-delete-bar').style.width = deletePercent + '%';
        } else {
            document.getElementById('op-create-bar').style.width = '0%';
            document.getElementById('op-update-bar').style.width = '0%';
            document.getElementById('op-delete-bar').style.width = '0%';
        }
        
        document.getElementById('op-create-count').textContent = metrics.events_24h.create;
        document.getElementById('op-update-count').textContent = metrics.events_24h.update;
        document.getElementById('op-delete-count').textContent = metrics.events_24h.delete;
        
        // Update stats
        document.getElementById('stat-total-messages').textContent = metrics.total_messages;
        document.getElementById('stat-uptime').textContent = formatUptime(metrics.uptime_seconds);
        
        // Show count instead of names to avoid overflow
        const activeUsersCount = metrics.active_nicknames.length;
        const activeUsersText = activeUsersCount > 0 
            ? `${activeUsersCount} user${activeUsersCount !== 1 ? 's' : ''} online`
            : 'No users';
        document.getElementById('stat-active-users').textContent = activeUsersText;
        document.getElementById('stat-active-users').title = metrics.active_nicknames.join(', ') || 'None';
        
        document.getElementById('stat-create').textContent = metrics.cdc_events.create;
        document.getElementById('stat-update').textContent = metrics.cdc_events.update;
        document.getElementById('stat-delete').textContent = metrics.cdc_events.delete;
        
        // Update CDC Activity Chart
        updateCDCChart(metrics.cdc_events);
        
    } catch (error) {
        console.error('Failed to fetch metrics:', error);
    }
}

function updateCDCChart(cdcEvents) {
    if (!cdcActivityChart) return;
    
    const now = new Date().toLocaleTimeString();
    
    // Keep last 20 data points
    if (cdcActivityChart.data.labels.length > 20) {
        cdcActivityChart.data.labels.shift();
        cdcActivityChart.data.datasets.forEach(dataset => {
            dataset.data.shift();
        });
    }
    
    cdcActivityChart.data.labels.push(now);
    cdcActivityChart.data.datasets[0].data.push(cdcEvents.create);
    cdcActivityChart.data.datasets[1].data.push(cdcEvents.update);
    cdcActivityChart.data.datasets[2].data.push(cdcEvents.delete);
    
    cdcActivityChart.update('none'); // Update without animation for smoother real-time updates
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
        return `${days}d ${hours}h`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

