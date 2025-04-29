// Notification Handler for Medicine Reminder App

document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const notificationPermissionBadge = document.getElementById('notification-permission');
    const soundCapabilityBadge = document.getElementById('sound-capability');
    const requestPermissionBtn = document.getElementById('request-permission');
    const testNotificationBtn = document.getElementById('test-notification');
    const testSoundBtn = document.getElementById('test-sound');
    const notificationStatus = document.getElementById('notification-status');
    const soundStatus = document.getElementById('sound-status');
    const debugLog = document.getElementById('debug-log');
    const clearLogsBtn = document.getElementById('clear-logs');

    // Audio context and source
    let audioContext = null;
    let soundSource = null;
    const alertSound = '/static/sounds/alert.mp3'; // Path to your alert sound file

    // Initialize everything
    function init() {
        checkNotificationPermission();
        initAudio();
        setupEventListeners();
        logDebug('Notification test page initialized');
    }

    // Initialize audio context
    function initAudio() {
        try {
            // Check if AudioContext is supported
            if (window.AudioContext || window.webkitAudioContext) {
                window.AudioContext = window.AudioContext || window.webkitAudioContext;
                audioContext = new AudioContext();
                updateSoundStatus('Ready', 'text-success');
                soundCapabilityBadge.textContent = 'Supported';
                soundCapabilityBadge.className = 'badge bg-success';
                testSoundBtn.disabled = false;
                logDebug('Audio context initialized successfully');
            } else {
                updateSoundStatus('Not supported', 'text-danger');
                soundCapabilityBadge.textContent = 'Not Supported';
                soundCapabilityBadge.className = 'badge bg-danger';
                testSoundBtn.disabled = true;
                logDebug('Audio context not supported by this browser', 'error');
            }
        } catch (error) {
            updateSoundStatus('Error: ' + error.message, 'text-danger');
            soundCapabilityBadge.textContent = 'Error';
            soundCapabilityBadge.className = 'badge bg-danger';
            testSoundBtn.disabled = true;
            logDebug('Error initializing audio context: ' + error.message, 'error');
        }
    }

    // Check notification permission
    function checkNotificationPermission() {
        if (!('Notification' in window)) {
            notificationPermissionBadge.textContent = 'Not Supported';
            notificationPermissionBadge.className = 'badge bg-danger';
            requestPermissionBtn.disabled = true;
            testNotificationBtn.disabled = true;
            logDebug('Browser does not support notifications', 'error');
            return;
        }

        const permission = Notification.permission;

        if (permission === 'granted') {
            notificationPermissionBadge.textContent = 'Granted';
            notificationPermissionBadge.className = 'badge bg-success';
            requestPermissionBtn.disabled = true;
            testNotificationBtn.disabled = false;
            logDebug('Notification permission already granted');
        } else if (permission === 'denied') {
            notificationPermissionBadge.textContent = 'Denied';
            notificationPermissionBadge.className = 'badge bg-danger';
            requestPermissionBtn.disabled = true;
            testNotificationBtn.disabled = true;
            logDebug('Notification permission denied', 'warning');
        } else {
            notificationPermissionBadge.textContent = 'Not Granted';
            notificationPermissionBadge.className = 'badge bg-warning';
            requestPermissionBtn.disabled = false;
            testNotificationBtn.disabled = true;
            logDebug('Notification permission not granted', 'warning');
        }
    }

    // Request notification permission
    function requestNotificationPermission() {
        if (!('Notification' in window)) {
            logDebug('Browser does not support notifications', 'error');
            return;
        }

        Notification.requestPermission()
            .then(function(permission) {
                logDebug(`Notification permission ${permission}`, permission === 'granted' ? 'success' : 'warning');
                checkNotificationPermission();
            })
            .catch(function(error) {
                logDebug('Error requesting notification permission: ' + error, 'error');
            });
    }

    // Send test notification
    function testNotification() {
        if (Notification.permission !== 'granted') {
            logDebug('Notification permission not granted', 'error');
            updateNotificationStatus('Permission denied', 'text-danger');
            return;
        }

        try {
            const options = {
                body: 'This is a test notification for your medicine reminder',
                icon: '/static/images/medical-care.svg',
                badge: '/static/images/medical-care.svg',
                timestamp: Date.now(),
                vibrate: [100, 50, 100],
                requireInteraction: true,
                actions: [
                    {
                        action: 'take',
                        title: 'Take Now'
                    },
                    {
                        action: 'snooze',
                        title: 'Snooze'
                    }
                ]
            };

            const notification = new Notification('Medicine Reminder', options);

            notification.onclick = function(event) {
                window.focus();
                logDebug('Notification clicked', 'info');
                notification.close();
            };

            logDebug('Test notification shown', 'success');
            updateNotificationStatus('Notification sent', 'text-success');
        } catch (error) {
            logDebug(`Error showing notification: ${error}`, 'error');
            updateNotificationStatus('Error: ' + error.message, 'text-danger');
        }
    }

    // Play test sound
    function testSound() {
        if (!audioContext) {
            updateSoundStatus('Audio context not available', 'text-danger');
            logDebug('Cannot play sound: audio context not available', 'error');
            return;
        }

        try {
            // Resume audio context if it's suspended (browsers require user interaction)
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }

            // Create a new audio element
            const audio = new Audio(alertSound);
            audio.addEventListener('canplaythrough', () => {
                audio.play()
                    .then(() => {
                        updateSoundStatus('Sound playing', 'text-success');
                        logDebug('Test sound playing', 'success');
                        
                        audio.onended = function() {
                            updateSoundStatus('Sound played successfully', 'text-success');
                            logDebug('Test sound finished playing', 'info');
                        };
                    })
                    .catch(error => {
                        updateSoundStatus('Error playing sound: ' + error.message, 'text-danger');
                        logDebug('Error playing sound: ' + error.message, 'error');
                    });
            });
            
            audio.addEventListener('error', (e) => {
                updateSoundStatus(`Error loading sound file: ${e.target.error.code}`, 'text-danger');
                logDebug(`Error loading sound file: ${e.target.error.code}`, 'error');
            });
            
            audio.load();
        } catch (error) {
            updateSoundStatus('Error: ' + error.message, 'text-danger');
            logDebug('Error playing test sound: ' + error.message, 'error');
        }
    }

    // Update notification status display
    function updateNotificationStatus(message, className) {
        notificationStatus.textContent = message;
        notificationStatus.className = className || '';
    }

    // Update sound status display
    function updateSoundStatus(message, className) {
        soundStatus.textContent = message;
        soundStatus.className = className || '';
    }

    // Add log message to debug console
    function logDebug(message, level = 'info') {
        const timestamp = new Date().toTimeString().split(' ')[0];
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        
        const timestampSpan = document.createElement('span');
        timestampSpan.className = 'timestamp';
        timestampSpan.textContent = timestamp;
        
        const messageSpan = document.createElement('span');
        messageSpan.className = `log-message log-${level}`;
        messageSpan.textContent = message;
        
        logEntry.appendChild(timestampSpan);
        logEntry.appendChild(messageSpan);
        
        debugLog.appendChild(logEntry);
        
        // Auto-scroll to bottom
        debugLog.scrollTop = debugLog.scrollHeight;
    }

    // Clear logs
    function clearLogs() {
        debugLog.innerHTML = '';
        logDebug('Logs cleared');
    }

    // Set up event listeners
    function setupEventListeners() {
        requestPermissionBtn.addEventListener('click', requestNotificationPermission);
        testNotificationBtn.addEventListener('click', testNotification);
        testSoundBtn.addEventListener('click', testSound);
        clearLogsBtn.addEventListener('click', clearLogs);
    }

    // Initialize the page
    init();
}); 