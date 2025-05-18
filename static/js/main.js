// Add any client-side JavaScript functionality here
document.addEventListener('DOMContentLoaded', function() {
    // Function to get CSRF token from meta tag or hidden input
    function getCSRFToken() {
        // Try to get from meta tag first (best practice)
        const metaToken = document.querySelector('meta[name="csrf-token"]');
        if (metaToken) {
            return metaToken.getAttribute('content');
        }
        
        // Try to get from hidden input field
        const tokenInput = document.querySelector('input[name="csrf_token"]');
        if (tokenInput) {
            return tokenInput.value;
        }
        
        // Return null if not found
        console.warn('CSRF token not found!');
        return null;
    }
    
    // Function to create headers with CSRF token
    function createHeaders(includeXMLRequestedWith = true) {
        const headers = {};
        const token = getCSRFToken();
        
        if (token) {
            headers['X-CSRFToken'] = token;
        }
        
        if (includeXMLRequestedWith) {
            headers['X-Requested-With'] = 'XMLHttpRequest';
        }
        
        return headers;
    }
    
    // Show error message
    function showError(message, form) {
        // Check if there's an existing status message and remove it
        const existingMessage = document.querySelector('.status-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // Create status message element
        const statusMessage = document.createElement('div');
        statusMessage.className = 'status-message error';
        statusMessage.textContent = message;
        
        // Add to DOM
        document.body.appendChild(statusMessage);
        
        // Trigger animation
        setTimeout(() => {
            statusMessage.classList.add('show');
        }, 10);
        
        // Status message will auto-hide via CSS animation
        // We still remove it from DOM after animation completes
        setTimeout(() => {
            if (statusMessage.parentNode) {
                statusMessage.remove();
            }
        }, 3500); // Slightly longer than the animation duration (3s + 0.5s buffer)
    }
    
    // Function to show success message
    function showSuccess(message) {
        // Check if there's an existing status message and remove it
        const existingMessage = document.querySelector('.status-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // Create status message element
        const statusMessage = document.createElement('div');
        statusMessage.className = 'status-message success';
        statusMessage.textContent = message;
        
        // Add to DOM
        document.body.appendChild(statusMessage);
        
        // Trigger animation
        setTimeout(() => {
            statusMessage.classList.add('show');
        }, 10);
        
        // Status message will auto-hide via CSS animation
        // We still remove it from DOM after animation completes
        setTimeout(() => {
            if (statusMessage.parentNode) {
                statusMessage.remove();
            }
        }, 3500); // Slightly longer than the animation duration (3s + 0.5s buffer)
    }
    
    // Form submissions
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const reminderForm = document.getElementById('reminderForm');
    
    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const emailInput = this.querySelector('input[name="email"]');
            const passwordInput = this.querySelector('input[name="password"]');
            
            if (!emailInput.value || !passwordInput.value) {
                showError('Please fill in all fields');
                return;
            }
            
            const formData = new FormData(this);
            
            fetch('/login', {
                method: 'POST',
                body: formData,
                headers: createHeaders()
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    window.location.href = data.redirect || '/dashboard';
                } else {
                    showError(data.message || 'Login failed. Please try again.');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showError('Error submitting form. Please try again.');
            });
        });
    }
    
    // Signup form submission
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const nameInput = this.querySelector('input[name="name"]');
            const emailInput = this.querySelector('input[name="email"]');
            const passwordInput = this.querySelector('input[name="password"]');
            
            if (!nameInput.value || !emailInput.value || !passwordInput.value) {
                showError('Please fill in all fields');
                return;
            }
            
            const formData = new FormData(this);
            
            fetch('/register', {
                method: 'POST',
                body: formData,
                headers: createHeaders()
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    window.location.href = data.redirect || '/dashboard';
                } else {
                    showError(data.message || 'Signup failed. Please try again.');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showError('Error submitting form. Please try again.');
            });
        });
        
        // Password strength indicator
        const passwordInput = document.querySelector('input[name="password"]');
        const strengthIndicator = document.createElement('div');
        strengthIndicator.className = 'password-strength';
        
        if (passwordInput) {
            passwordInput.parentNode.appendChild(strengthIndicator);
            
            passwordInput.addEventListener('input', function() {
                const value = this.value;
                let strength = 0;
                
                if (value.length >= 8) strength += 1;
                if (value.match(/[a-z]/) && value.match(/[A-Z]/)) strength += 1;
                if (value.match(/\d/)) strength += 1;
                if (value.match(/[^a-zA-Z\d]/)) strength += 1;
                
                strengthIndicator.className = 'password-strength';
                if (value.length === 0) {
                    strengthIndicator.style.display = 'none';
                } else {
                    strengthIndicator.style.display = 'block';
                    
                    if (strength === 0) {
                        strengthIndicator.classList.add('very-weak');
                        strengthIndicator.textContent = 'Very Weak';
                    } else if (strength === 1) {
                        strengthIndicator.classList.add('weak');
                        strengthIndicator.textContent = 'Weak';
                    } else if (strength === 2) {
                        strengthIndicator.classList.add('medium');
                        strengthIndicator.textContent = 'Medium';
                    } else if (strength === 3) {
                        strengthIndicator.classList.add('strong');
                        strengthIndicator.textContent = 'Strong';
                    } else {
                        strengthIndicator.classList.add('very-strong');
                        strengthIndicator.textContent = 'Very Strong';
                    }
                }
            });
        }
    }
    
    // Reminder Form Validation
    if (reminderForm) {
        reminderForm.addEventListener('submit', function(e) {
            const medicineName = document.getElementById('medicine_name').value;
            const dosage = document.getElementById('dosage').value;
            const reminderTime = document.getElementById('reminder_time').value;
            const frequency = document.getElementById('frequency').value;
            const startDate = document.getElementById('start_date').value;
            const endDate = document.getElementById('end_date').value;
            
            if (!medicineName || !dosage || !reminderTime || !frequency || !startDate || !endDate) {
                e.preventDefault();
                showError('Please fill in all required fields');
                return false;
            }
            
            // Validate dates
            if (new Date(endDate) < new Date(startDate)) {
                e.preventDefault();
                showError('End date cannot be before start date');
                return false;
            }
            
            return true;
        });
    }
    
    // Show days selector based on frequency
    const frequencySelect = document.getElementById('frequency');
    const daysGroup = document.getElementById('daysGroup');
    
    if (frequencySelect && daysGroup) {
        frequencySelect.addEventListener('change', function() {
            if (this.value === 'weekly') {
                daysGroup.style.display = 'block';
            } else {
                daysGroup.style.display = 'none';
            }
        });
        
        // Initialize on page load
        if (frequencySelect.value === 'weekly') {
            daysGroup.style.display = 'block';
        } else {
            daysGroup.style.display = 'none';
        }
    }
    
    // Date validation
    const startDateInput = document.getElementById('start_date');
    const endDateInput = document.getElementById('end_date');
    
    if (startDateInput && endDateInput) {
        // Set min date for start date to today if not already set
        if (!startDateInput.min) {
            const today = new Date().toISOString().split('T')[0];
            startDateInput.min = today;
        }
        
        // Update end date min value when start date changes
        startDateInput.addEventListener('change', function() {
            endDateInput.min = this.value;
            
            // If end date is before start date, update it
            if (endDateInput.value && endDateInput.value < this.value) {
                endDateInput.value = this.value;
            }
        });
        
        // Initialize end date min value
        if (startDateInput.value) {
            endDateInput.min = startDateInput.value;
        } else {
            const today = new Date().toISOString().split('T')[0];
            endDateInput.min = today;
        }
    }
    
    // Modal functionality
    const loginModalBtn = document.getElementById('loginModalBtn');
    const signupModalBtn = document.getElementById('signupModalBtn');
    const loginModal = document.getElementById('loginModal');
    const signupModal = document.getElementById('signupModal');
    const closeButtons = document.querySelectorAll('.close');
    
    function showModal(modal) {
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }
    
    function hideModal(modal) {
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }
    
    if (loginModalBtn && loginModal) {
        loginModalBtn.addEventListener('click', function() {
            showModal(loginModal);
        });
    }
    
    if (signupModalBtn && signupModal) {
        signupModalBtn.addEventListener('click', function() {
            showModal(signupModal);
        });
    }
    
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            hideModal(modal);
        });
    });
    
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            hideModal(e.target);
        }
    });
    
    // Voice Reminder functionality
    let voiceReminderTimer;
    const speechSynthesis = window.speechSynthesis;
    let notifiedReminders = {}; // Track which reminders have been notified in the current minute
    let serverTimeOffset = 0; // Time difference between server and client in milliseconds

    // Function to get server-synchronized time
    function getSyncedTime() {
        // Create a new date object
        const clientTime = new Date();
        
        // Apply the server time offset
        const syncedTime = new Date(clientTime.getTime() + serverTimeOffset);
        
        // Log the time difference if significant
        if (Math.abs(serverTimeOffset) > 60000) { // If more than 1 minute difference
            console.log(`Using time-synced clock: ${syncedTime.toLocaleTimeString()} (client clock: ${clientTime.toLocaleTimeString()}, offset: ${serverTimeOffset/1000}s)`);
        }
        
        return syncedTime;
    }

    // Function to synchronize client clock with server time
    function syncServerTime() {
        const requestStartTime = new Date().getTime();

        fetch('/server_time')
            .then(response => response.json())
            .then(data => {
                const requestEndTime = new Date().getTime();
                const requestDuration = (requestEndTime - requestStartTime) / 2;
                
                if (data.success) {
                    const serverTime = new Date(data.server_time);
                    
                    // Adjust for network latency
                    serverTime.setMilliseconds(serverTime.getMilliseconds() + requestDuration);
                    
                    // Calculate time offset
                    const clientTime = new Date();
                    serverTimeOffset = serverTime - clientTime;
                    
                    console.log("Synced with server. Time offset: " + serverTimeOffset + "ms");
                    
                    // Warn if time difference is significant (more than 60 seconds)
                    if (Math.abs(serverTimeOffset) > 60000) {
                        console.warn("WARNING: Large time difference between client and server: " + 
                            (serverTimeOffset / 1000) + " seconds");
                    }
                    
                    // Schedule next sync in 15 minutes
                    setTimeout(syncServerTime, 15 * 60 * 1000);
                    
                    // Check for reminders immediately after sync
                    checkForReminders();
                } else {
                    console.error("Failed to sync with server time");
                    // Retry in 1 minute
                    setTimeout(syncServerTime, 60 * 1000);
                }
            })
            .catch(error => {
                console.error("Error syncing with server time:", error);
                // Retry in 1 minute
                setTimeout(syncServerTime, 60 * 1000);
            });
    }

    // Function to check for reminders that should trigger now
    function checkForReminders() {
        // Get current time, using synchronized time if available
        const now = getSyncedTime();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        // Format current time as HH:MM for exact matching
        const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
        
        // For debugging - log at a less verbose level
        console.log(`Checking reminders at ${currentTime}`);
        
        // Add more precise time tracking
        const currentSeconds = now.getSeconds();
        const currentMillis = now.getMilliseconds();
        console.log(`Precise time: ${currentTime}:${currentSeconds}.${currentMillis}`);
        
        const currentDay = now.getDay(); // 0 (Sunday) to 6 (Saturday)
        const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const today = daysOfWeek[currentDay];
        
        // Track reminders with a more precise key including hour and minute
        const timeKey = `${currentHour}:${currentMinute}`;
        
        // Initialize if needed
        if (!window.notifiedReminders) {
            window.notifiedReminders = {};
        }
        
        // Reset notification tracking at the start of each minute
        if (!window.notifiedReminders[timeKey]) {
            window.notifiedReminders[timeKey] = new Set();
        }
        
        // Fetch active reminders with a timestamp to prevent caching
        const timestamp = new Date().getTime();
        fetch(`/get_active_reminders_detailed?t=${timestamp}`, {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/json'
            },
            // Ensure no caching
            credentials: 'same-origin',
            cache: 'no-store'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.reminders && data.reminders.length > 0) {
                // Create a queue for reminders to be notified sequentially
                const remindersToNotify = [];
                
                data.reminders.forEach(reminder => {
                    // Normalize the time format for comparison
                    let reminderTime = reminder.reminder_time;
                    if (!reminderTime.includes(':')) {
                        reminderTime = reminderTime + ':00'; // Add seconds if not present
                    }
                    
                    // Extract reminder hours and minutes for exact comparison
                    const [reminderHours, reminderMinutes] = reminderTime.split(':').map(Number);
                    const reminderTimeFormatted = `${reminderHours.toString().padStart(2, '0')}:${reminderMinutes.toString().padStart(2, '0')}`;
                    
                    // Improved logging for debugging
                    console.log(`Checking reminder: ${reminder.id} - ${reminder.medicine_name} - Time: ${reminderTimeFormatted} vs Current: ${currentTime}`);
                    
                    // Check if we've already notified this reminder during this minute
                    if (window.notifiedReminders[timeKey].has(reminder.id)) {
                        console.log(`Reminder ${reminder.id} already notified at ${timeKey}`);
                        return; // Skip this reminder
                    }
                    
                    // Determine if the reminder should trigger now
                    let shouldTrigger = reminderTimeFormatted === currentTime;
                    
                    // Only check time match if we haven't processed this reminder in this minute
                    if (shouldTrigger) {
                        console.log(`Time match for reminder ${reminder.id}: ${reminderTimeFormatted} = ${currentTime}`);
                    
                        if (reminder.frequency === 'once') {
                            // For 'once' reminders, check if today is the start date
                            const reminderDate = new Date(reminder.start_date);
                            const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                            const reminderDateOnly = new Date(reminderDate.getFullYear(), reminderDate.getMonth(), reminderDate.getDate());
                            
                            shouldTrigger = reminderDateOnly.getTime() === todayDate.getTime();
                            console.log(`'Once' reminder date comparison: ${reminderDateOnly.toDateString()} vs ${todayDate.toDateString()} = ${shouldTrigger}`);
                        } else if (reminder.frequency === 'daily') {
                            // For 'daily' reminders, check if today is within the date range
                            const startDate = new Date(reminder.start_date);
                            const endDate = new Date(reminder.end_date);
                            const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                            
                            // Set times to midnight for date-only comparison
                            startDate.setHours(0, 0, 0, 0);
                            endDate.setHours(23, 59, 59, 999);
                            
                            shouldTrigger = todayDate >= startDate && todayDate <= endDate;
                            console.log(`'Daily' reminder date range check: ${startDate.toDateString()} to ${endDate.toDateString()} = ${shouldTrigger}`);
                        } else if (reminder.frequency === 'weekly') {
                            // For 'weekly' reminders, check if today is the specified day and within date range
                            const startDate = new Date(reminder.start_date);
                            const endDate = new Date(reminder.end_date);
                            const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                            
                            // Set times to midnight for date-only comparison
                            startDate.setHours(0, 0, 0, 0);
                            endDate.setHours(23, 59, 59, 999);
                            
                            const isDayMatch = reminder.days ? reminder.days.includes(today) : false;
                            shouldTrigger = todayDate >= startDate && todayDate <= endDate && isDayMatch;
                            console.log(`'Weekly' reminder checks: Day match (${isDayMatch}), Date range (${todayDate >= startDate && todayDate <= endDate})`);
                        }
                        
                        if (shouldTrigger) {
                            console.log(`⏰ Scheduling reminder for: ${reminder.medicine_name}`);
                            remindersToNotify.push(reminder);
                            // Mark this reminder as notified for this minute
                            window.notifiedReminders[timeKey].add(reminder.id);
                        }
                    }
                });
                
                // Process reminders in sequence with delay between each
                if (remindersToNotify.length > 0) {
                    console.log(`Processing ${remindersToNotify.length} reminders`);
                    processRemindersSequentially(remindersToNotify);
                }
            }
        })
        .catch(error => {
            console.error('Error checking reminders:', error);
        });
    }
    
    // Process reminders sequentially with delay between each
    function processRemindersSequentially(reminders, index = 0) {
        if (index >= reminders.length) return;
        
        const reminder = reminders[index];
        console.log(`Processing reminder ${index + 1}/${reminders.length}: ${reminder.medicine_name} (Alert type: ${reminder.alert_type})`);
        
        // Play the appropriate alert based on alert_type
        if (reminder.alert_type === 'voice') {
            // Play voice alert
            playVoiceAlert(reminder);
        } else if (reminder.alert_type === 'sound1' || reminder.alert_type === 'sound2' || reminder.alert_type === 'sound3') {
            // Play sound alert
            playAlertSound(reminder);
        } else {
            // Default to voice alert if alert_type is not recognized
            console.log(`Unknown alert type: ${reminder.alert_type}, defaulting to voice`);
            playVoiceAlert(reminder);
        }
        
        // Move to the next reminder after a delay
        setTimeout(() => {
            processRemindersSequentially(reminders, index + 1);
        }, 8000); // 8-second delay between reminders
    }

    // Function to play voice alert using Web Speech API
    function playVoiceAlert(reminder) {
        if (!speechSynthesis) {
            console.error('Speech synthesis not supported in this browser');
            return;
        }
        
        console.log('Voice Alert Debug: Starting to play voice alert', {
            browser: navigator.userAgent,
            reminder: reminder,
            speechSynthesisState: speechSynthesis.speaking ? 'speaking' : 'idle'
        });
        
        // Only cancel ongoing speech if it's been speaking for more than 30 seconds
        // This prevents cutting off important ongoing messages
        if (speechSynthesis.speaking) {
            const now = new Date().getTime();
            if (!window.speechStartTime || (now - window.speechStartTime > 30000)) {
                console.log('Canceling stalled speech before new alert');
                speechSynthesis.cancel();
            } else {
                console.log('Speech in progress, waiting 2 seconds before new alert');
                setTimeout(() => playVoiceAlert(reminder), 2000);
                return;
            }
        }
        
        // Create utterance
        const utterance = new SpeechSynthesisUtterance();
        const customMessage = reminder.alert_message;
        
        // Use custom message if available, otherwise use default
        if (customMessage) {
            utterance.text = customMessage;
        } else {
            utterance.text = `Time to take your medication. ${reminder.medicine_name}, ${reminder.dosage}.`;
        }
        
        // Adjust speech parameters for better clarity and timing
        utterance.volume = 0.9; // Slightly lower volume (0-1)
        utterance.rate = 0.9;   // Slightly slower for better clarity
        utterance.pitch = 1;    // Natural pitch
        utterance.lang = 'en-US';
        
        // Track when speech starts
        window.speechStartTime = new Date().getTime();
        
        // Add event handler to track when speech has finished
        utterance.onend = function(event) {
            console.log(`Voice alert finished: "${utterance.text}"`);
            window.speechStartTime = null;
        };
        
        // Handle any errors that occur during speech
        utterance.onerror = function(event) {
            console.error('Speech synthesis error:', event);
            window.speechStartTime = null;
        };
        
        // Log for debugging
        console.log(`Playing voice alert: "${utterance.text}"`);
        
        try {
            // Speak the utterance
            speechSynthesis.speak(utterance);
            
            // Check if it's actually speaking
            setTimeout(() => {
                if (speechSynthesis.speaking) {
                    console.log('Voice alert confirmed: speech synthesis is active');
                } else {
                    console.warn('Voice alert may have failed: speech synthesis not active');
                    // Try to restart it
                    speechSynthesis.cancel();
                    speechSynthesis.speak(utterance);
                }
            }, 500);
            
            // Firefox workaround: speech synthesis sometimes stops unexpectedly
            if (navigator.userAgent.indexOf('Firefox') > -1) {
                // Keep the synthesis alive with an interval
                const synthKeepAlive = setInterval(() => {
                    if (speechSynthesis.speaking) {
                        speechSynthesis.pause();
                        speechSynthesis.resume();
                    } else {
                        clearInterval(synthKeepAlive);
                    }
                }, 10000); // Check every 10 seconds
            }
        } catch (error) {
            console.error('Error starting speech synthesis:', error);
            // Try an alternative approach
            setTimeout(() => {
                try {
                    speechSynthesis.cancel();
                    speechSynthesis.speak(utterance);
                    console.log('Retried voice alert after error');
                } catch (retryError) {
                    console.error('Retry also failed:', retryError);
                }
            }, 1000);
        }
    }

    // Function to ensure speech synthesis is ready and not hung
    function ensureSpeechSynthesisReady() {
        if (!speechSynthesis) return;
        
        // Only reset speech if it's been speaking for more than 60 seconds
        // This prevents interrupting valid announcements
        if (speechSynthesis.speaking) {
            const now = new Date().getTime();
            if (!window.speechStartTime || (now - window.speechStartTime > 60000)) {
                console.log('Speech synthesis appears hung, resetting...');
                speechSynthesis.cancel();
                window.speechStartTime = null;
            }
        }
    }

    // Start the reminder checker when the document is loaded
    if (document.querySelector('.dashboard-container') || document.querySelector('.reminder-list')) {
        // Initialize and warm up the speech synthesis engine
        initSpeechSynthesis();
        
        // Request notification permission on page load if needed
        if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission().then(function(permission) {
                console.log('Notification permission status:', permission);
            });
        }
        
        console.log('Initial reminder check on page load...');
        
        // Synchronize client clock with server
        syncServerTime();
        
        // Check immediately on page load for any current reminders
        checkForReminders();
        
        // Synchronize with the clock to check precisely at each 10-second mark
        synchronizeReminderChecks();
        
        // Also occasionally reset the speech synthesis API to prevent hanging
        setInterval(ensureSpeechSynthesisReady, 5 * 60 * 1000); // Every 5 minutes
        
        console.log('Voice reminder checker started with synchronized timing');
    } else {
        console.log('Dashboard container or reminder list not found - reminders will not be checked');
    }
    
    /**
     * Synchronize reminder checks to happen exactly on minute intervals
     * This ensures more precise timing for medications without unnecessary checks
     */
    function synchronizeReminderChecks() {
        // First check immediately
        checkForReminders();
        
        // Create a function to schedule the next check precisely at the start of the next minute
        function scheduleNextCheck() {
            const now = new Date();
            // Calculate milliseconds until the start of next minute
            const delay = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
            
            console.log(`Scheduling next reminder check in ${delay}ms`);
            
            setTimeout(() => {
                // Run the check at the start of the minute
                checkForReminders();
                
                // Also set up a recurring 15-second check to catch any that might have been missed
                // This helps with browser tab focus issues or system sleep
                const intervalId = setInterval(checkForReminders, 15000);
                
                // Store the interval ID so we can clear it later if needed
                window.reminderCheckIntervalId = intervalId;
                
                // Schedule the next exact-minute check
                scheduleNextCheck();
            }, delay);
        }
        
        // Start the scheduling cycle
        scheduleNextCheck();
    }

    // Profile Dropdown Toggle
    const profileToggle = document.querySelector('.profile-dropdown-toggle');
    const profileMenu = document.querySelector('.profile-dropdown-menu');
    
    if (profileToggle && profileMenu) {
        // Close the dropdown when clicking outside
        document.addEventListener('click', function(event) {
            if (!profileToggle.contains(event.target) && !profileMenu.contains(event.target)) {
                profileMenu.style.display = 'none';
            }
        });
        
        // Toggle dropdown on click
        profileToggle.addEventListener('click', function(event) {
            event.preventDefault();
            profileMenu.style.display = profileMenu.style.display === 'block' ? 'none' : 'block';
        });
    }
    
    // Update notification count
    updateNotificationCount();
});

// Reminder Management Functions
function toggleReminder(id) {
    const token = document.querySelector('input[name="csrf_token"]');
    const headers = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    };
    
    if (token) {
        headers['X-CSRFToken'] = token.value;
    }
    
    fetch(`/toggle_reminder/${id}`, {
        method: 'POST',
        headers: headers
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Refresh the page to reflect changes
            location.reload();
        } else {
            console.error(data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

function editReminder(id) {
    window.location.href = `/edit_reminder/${id}`;
}

function deleteReminder(id) {
    if (!confirm('Are you sure you want to delete this reminder?')) {
        return;
    }
    
    const token = document.querySelector('input[name="csrf_token"]');
    const headers = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    };
    
    if (token) {
        headers['X-CSRFToken'] = token.value;
    }
    
    fetch(`/delete_reminder/${id}`, {
        method: 'POST',
        headers: headers
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Remove reminder from UI or refresh page
            location.reload();
        } else {
            console.error(data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

// Modal functionality
function showLogin() {
    const loginModal = document.getElementById('loginModal');
    const signupModal = document.getElementById('signupModal');
    if (loginModal) {
        loginModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    if (signupModal) {
        signupModal.style.display = 'none';
    }
}

function showSignup() {
    const loginModal = document.getElementById('loginModal');
    const signupModal = document.getElementById('signupModal');
    if (signupModal) {
        signupModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    if (loginModal) {
        loginModal.style.display = 'none';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
        document.body.style.overflow = '';
    }
}

function requestNotificationPermission() {
    return new Promise(function(resolve) {
        if (!('Notification' in window)) {
            logMessage('Notifications not supported');
            updateStatus('notification-status', 'Not supported', 'text-danger');
            resolve('denied');
            return;
        }
        
        if (Notification.permission === 'granted') {
            updateStatus('notification-status', 'Permission granted', 'text-success');
            resolve('granted');
            return;
        }
        
        if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(function(permission) {
                updateStatus('notification-status', 'Permission ' + permission, 
                    permission === 'granted' ? 'text-success' : 'text-danger');
                resolve(permission);
            });
        } else {
            updateStatus('notification-status', 'Permission denied', 'text-danger');
            resolve('denied');
        }
    });
}

function showTestNotification() {
    try {
        const notification = new Notification('Medication Reminder', {
            body: 'Time to take your medicine!',
            icon: '/static/images/logo.png'
        });
        
        notification.onclick = function() {
            window.focus();
            notification.close();
            logMessage('Notification clicked');
        };
        
        updateStatus('notification-status', 'Notification sent', 'text-success');
        logMessage('Test notification displayed');
    } catch (error) {
        updateStatus('notification-status', 'Error: ' + error.message, 'text-danger');
        logMessage('Error showing notification: ' + error.message);
    }
}

function playTestSound(soundType) {
    let soundFile;
    switch (soundType) {
        case 'bell':
            soundFile = '/static/sounds/bell.mp3';
            break;
        case 'chime':
            soundFile = '/static/sounds/chime.mp3';
            break;
        case 'beep':
            soundFile = '/static/sounds/beep.mp3';
            break;
        default:
            soundFile = '/static/sounds/bell.mp3';
    }
    
    const audio = new Audio(soundFile);
    
    audio.onplay = function() {
        updateStatus('sound-status', 'Playing ' + soundType, 'text-success');
        logMessage('Playing sound: ' + soundType);
    };
    
    audio.onended = function() {
        updateStatus('sound-status', 'Completed ' + soundType, 'text-info');
    };
    
    audio.onerror = function(error) {
        updateStatus('sound-status', 'Error playing sound', 'text-danger');
        logMessage('Error playing sound: ' + soundType + ' - ' + error.message);
    };
    
    try {
        audio.play().catch(function(error) {
            updateStatus('sound-status', 'Error: ' + error.message, 'text-danger');
            logMessage('Error playing sound: ' + error.message);
        });
    } catch (error) {
        updateStatus('sound-status', 'Error: ' + error.message, 'text-danger');
        logMessage('Exception playing sound: ' + error.message);
    }
}

function updateStatus(elementId, message, className) {
    const statusElement = document.getElementById(elementId);
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = className;
    }
}

function logMessage(message) {
    const console = document.getElementById('debug-console');
    if (console) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.textContent = `[${timestamp}] ${message}`;
        console.appendChild(logEntry);
        console.scrollTop = console.scrollHeight;
    }
}

// Test Notification Page Functions
document.addEventListener('DOMContentLoaded', function() {
    // Only run this code if we're on the test notification page
    if (!document.querySelector('.test-notification-page')) return;
    
    const notifPermissionBadge = document.getElementById('notification-permission');
    const requestPermissionBtn = document.getElementById('request-permission');
    const testNotificationBtn = document.getElementById('test-notification');
    const testSoundBtn = document.getElementById('test-sound');
    const clearLogsBtn = document.getElementById('clear-logs');
    const debugConsole = document.getElementById('debug-console');
    
    // Update notification permission status
    function updatePermissionStatus() {
        if (!('Notification' in window)) {
            notifPermissionBadge.textContent = 'Not Supported';
            notifPermissionBadge.className = 'status-badge bg-danger';
            requestPermissionBtn.disabled = true;
            testNotificationBtn.disabled = true;
            logToConsole('Browser does not support notifications', 'error');
            return;
        }
        
        const permission = Notification.permission;
        notifPermissionBadge.textContent = permission.charAt(0).toUpperCase() + permission.slice(1);
        
        if (permission === 'granted') {
            notifPermissionBadge.className = 'status-badge bg-success';
            requestPermissionBtn.disabled = true;
            testNotificationBtn.disabled = false;
        } else if (permission === 'denied') {
            notifPermissionBadge.className = 'status-badge bg-danger';
            requestPermissionBtn.disabled = true;
            testNotificationBtn.disabled = true;
        } else {
            notifPermissionBadge.className = 'status-badge bg-warning';
            requestPermissionBtn.disabled = false;
            testNotificationBtn.disabled = true;
        }
    }
    
    // Log messages to debug console
    function logToConsole(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        
        const timestampSpan = document.createElement('span');
        timestampSpan.className = 'log-timestamp';
        timestampSpan.textContent = timestamp;
        
        const messageSpan = document.createElement('span');
        messageSpan.className = `log-${type}`;
        messageSpan.textContent = message;
        
        logEntry.appendChild(timestampSpan);
        logEntry.appendChild(messageSpan);
        
        debugConsole.appendChild(logEntry);
        debugConsole.scrollTop = debugConsole.scrollHeight;
    }
    
    // Request notification permission
    function requestNotificationPermission() {
        if (!('Notification' in window)) {
            logToConsole('Browser does not support notifications', 'error');
            return;
        }
        
        Notification.requestPermission()
            .then(function(permission) {
                logToConsole(`Notification permission ${permission}`, permission === 'granted' ? 'success' : 'warning');
                updatePermissionStatus();
            })
            .catch(function(error) {
                logToConsole(`Error requesting permission: ${error}`, 'error');
            });
    }
    
    // Show test notification
    function showTestNotification() {
        if (Notification.permission !== 'granted') {
            logToConsole('Notification permission not granted', 'error');
            return;
        }
        
        const options = {
            body: 'This is a test notification for your medicine reminder',
            icon: '/static/images/pill-icon.png',
            badge: '/static/images/badge-icon.png',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: 1
            },
            actions: [
                {action: 'taken', title: 'Mark as Taken'},
                {action: 'dismiss', title: 'Dismiss'}
            ]
        };
        
        try {
            const notification = new Notification('Medicine Reminder', options);
            
            notification.onclick = function(event) {
                event.preventDefault();
                logToConsole('Notification clicked', 'info');
                notification.close();
            };
            
            logToConsole('Test notification shown', 'success');
        } catch (error) {
            logToConsole(`Error showing notification: ${error}`, 'error');
        }
    }
    
    // Test sound alert
    function testSoundAlert() {
        try {
            // Create a sound selection interface
            if (!document.getElementById('sound-type-selector')) {
                const container = document.createElement('div');
                container.id = 'sound-type-selector';
                container.className = 'mt-3 mb-3';
                container.innerHTML = `
                    <p>Select sound type to test:</p>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-primary test-sound-btn" data-sound="voice">Voice</button>
                        <button class="btn btn-sm btn-outline-primary test-sound-btn" data-sound="sound1">Bell</button>
                        <button class="btn btn-sm btn-outline-primary test-sound-btn" data-sound="sound2">Chime</button>
                        <button class="btn btn-sm btn-outline-primary test-sound-btn" data-sound="sound3">Beep</button>
                    </div>
                `;
                
                // Insert before the debug console
                const debugConsole = document.getElementById('debug-console');
                debugConsole.parentNode.insertBefore(container, debugConsole);
                
                // Add event listeners to buttons
                container.querySelectorAll('.test-sound-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const soundType = this.getAttribute('data-sound');
                        testSpecificSound(soundType);
                    });
                });
                
                logToConsole('Select a sound type to test', 'info');
            } else {
                // Default to testing voice if the interface is already present
                testSpecificSound('voice');
            }
        } catch (error) {
            logToConsole(`Error setting up sound test: ${error}`, 'error');
        }
    }
    
    // Test a specific sound type
    function testSpecificSound(soundType) {
        try {
            // Create a mock reminder object to test alerts
            const mockReminder = {
                id: 0,
                medicine_name: "Test Medicine",
                dosage: "Test Dosage",
                reminder_time: "12:00",
                alert_type: soundType,
                alert_message: "This is a test alert for your medicine reminder"
            };
            
            logToConsole(`Testing ${soundType} alert`, 'info');
            console.log(`Testing ${soundType} alert with mock reminder:`, mockReminder);
            
            if (soundType === 'voice') {
                playVoiceAlert(mockReminder);
            } else {
                playAlertSound(mockReminder);
            }
        } catch (error) {
            logToConsole(`Error playing ${soundType} alert: ${error}`, 'error');
        }
    }
    
    // Clear debug logs
    function clearDebugLogs() {
        debugConsole.innerHTML = '';
        logToConsole('Logs cleared', 'info');
    }
    
    // Event listeners
    if (requestPermissionBtn) {
        requestPermissionBtn.addEventListener('click', requestNotificationPermission);
    }
    
    if (testNotificationBtn) {
        testNotificationBtn.addEventListener('click', showTestNotification);
    }
    
    if (testSoundBtn) {
        testSoundBtn.addEventListener('click', testSoundAlert);
    }
    
    if (clearLogsBtn) {
        clearLogsBtn.addEventListener('click', clearDebugLogs);
    }
    
    // Initialize
    updatePermissionStatus();
    logToConsole('Test notification page initialized', 'info');
});

// Function to update notification badge count
function updateNotificationCount() {
    fetch('/get_active_reminders')
        .then(response => response.json())
        .then(data => {
            const notificationBadge = document.getElementById('notification-count');
            if (notificationBadge) {
                // Show combined count of upcoming and missed reminders
                const count = data.upcoming + data.missed;
                notificationBadge.textContent = count;
                
                // Hide badge if no reminders
                if (count === 0) {
                    notificationBadge.style.display = 'none';
                } else {
                    notificationBadge.style.display = 'inline-block';
                }
            }
        })
        .catch(error => {
            console.error('Error fetching notification count:', error);
        });
}

// Initialize speech synthesis
function initSpeechSynthesis() {
    if ('speechSynthesis' in window) {
        console.log('Speech synthesis available in this browser');
        
        // Get available voices
        let voices = speechSynthesis.getVoices();
        
        // In Chrome, getVoices() is async and might return an empty array initially
        if (voices.length === 0) {
            console.log('No voices available yet, waiting for voiceschanged event');
            
            speechSynthesis.onvoiceschanged = function() {
                voices = speechSynthesis.getVoices();
                console.log(`${voices.length} voices loaded:`, 
                    voices.map(v => `${v.name} (${v.lang}${v.default ? ' - DEFAULT' : ''})`));
            };
        } else {
            console.log(`${voices.length} voices available:`, 
                voices.map(v => `${v.name} (${v.lang}${v.default ? ' - DEFAULT' : ''})`));
        }
        
        // Warm up the synthesis engine with a silent utterance
        try {
            const warmupUtterance = new SpeechSynthesisUtterance('');
            warmupUtterance.volume = 0;
            warmupUtterance.onend = () => console.log('Speech synthesis engine warmed up');
            warmupUtterance.onerror = (e) => console.warn('Warmup utterance error:', e);
            speechSynthesis.speak(warmupUtterance);
        } catch (e) {
            console.error('Error during speech synthesis warmup:', e);
        }
    } else {
        console.warn('Speech synthesis not available in this browser');
    }
    
    // Also check if sound files can be loaded
    checkSoundFilesAvailability();
}

// Check if sound files can be loaded
function checkSoundFilesAvailability() {
    const soundFiles = [
        { name: 'bell', path: '/static/sounds/bell.mp3' },
        { name: 'chime', path: '/static/sounds/chime.mp3' },
        { name: 'beep', path: '/static/sounds/beep.mp3' }
    ];
    
    console.log('Checking sound files availability...');
    
    soundFiles.forEach(sound => {
        const audio = new Audio(sound.path);
        
        // Set up event listeners
        audio.addEventListener('canplaythrough', () => {
            console.log(`Sound file ${sound.name} is available and can be played`);
        });
        
        audio.addEventListener('error', (e) => {
            console.error(`Error loading sound file ${sound.name}: ${e.target.error ? e.target.error.code : 'unknown error'}`);
            
            // Check if file exists by using fetch
            fetch(sound.path, { method: 'HEAD' })
                .then(response => {
                    if (response.ok) {
                        console.log(`Sound file ${sound.name} exists on server but may not be playable`);
                    } else {
                        console.error(`Sound file ${sound.name} does not exist on server: ${response.status}`);
                    }
                })
                .catch(error => {
                    console.error(`Network error checking sound file ${sound.name}: ${error}`);
                });
        });
        
        // Just preload without playing
        audio.preload = 'metadata';
        audio.load();
    });
}

// Function to play sound alert
function playAlertSound(reminder) {
    console.log(`Playing sound alert for: ${reminder.medicine_name}`);
    
    let soundFile;
    switch (reminder.alert_type) {
        case 'sound1':
            soundFile = '/static/sounds/bell.mp3';
            console.log('Playing bell sound');
            break;
        case 'sound2':
            soundFile = '/static/sounds/chime.mp3';
            console.log('Playing chime sound');
            break;
        case 'sound3':
            soundFile = '/static/sounds/beep.mp3';
            console.log('Playing beep sound');
            break;
        default:
            soundFile = '/static/sounds/bell.mp3';
            console.log('Playing default sound (bell)');
    }
    
    const audio = new Audio(soundFile);
    
    // Add event handlers for tracking playback
    audio.onplay = function() {
        console.log(`Sound alert started: ${reminder.alert_type} for ${reminder.medicine_name}`);
    };
    
    audio.onended = function() {
        console.log(`Sound alert completed: ${reminder.alert_type} for ${reminder.medicine_name}`);
    };
    
    audio.onerror = function(error) {
        console.error(`Error playing sound alert: ${error.message}`);
    };
    
    try {
        // Play the sound and show browser notification
        audio.play().catch(error => {
            console.error(`Error playing sound: ${error.message}`);
            
            // Try to retry once if there's an error
            setTimeout(() => {
                try {
                    audio.play();
                    console.log('Retried playing sound after error');
                } catch (retryError) {
                    console.error(`Retry also failed: ${retryError.message}`);
                }
            }, 1000);
        });
        
        // Also show a browser notification for the reminder
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification('Medicine Reminder', {
                body: `Time to take ${reminder.medicine_name}, ${reminder.dosage}`,
                icon: '/static/images/medical-care.svg'
            });
            
            notification.onclick = function() {
                window.focus();
                notification.close();
            };
        }
    } catch (error) {
        console.error(`Exception playing sound: ${error.message}`);
    }
}

// Update this function to include CSRF token
function snoozeReminder(id, minutes = 5) {
    const token = document.querySelector('input[name="csrf_token"]');
    const headers = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    };
    
    if (token) {
        headers['X-CSRFToken'] = token.value;
    }
    
    fetch(`/snooze_reminder/${id}`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ minutes: minutes })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccess(`Reminder snoozed for ${minutes} minutes`);
            
            // You might want to update UI or reload
            setTimeout(() => {
                location.reload();
            }, 1500);
        } else {
            showError(data.message || 'Failed to snooze reminder');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showError('Failed to connect to server');
    });
}

// Update this function to include CSRF token
function markReminderTaken(id) {
    const token = document.querySelector('input[name="csrf_token"]');
    const headers = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    };
    
    if (token) {
        headers['X-CSRFToken'] = token.value;
    }
    
    fetch(`/mark_taken/${id}`, {
        method: 'POST',
        headers: headers
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccess('Reminder marked as taken');
            
            // Update UI or reload
            setTimeout(() => {
                location.reload();
            }, 1500);
        } else {
            showError(data.message || 'Failed to mark reminder as taken');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showError('Failed to connect to server');
    });
}

// Update this function to include CSRF token
function toggleVoiceAlert(id, enabled) {
    const token = document.querySelector('input[name="csrf_token"]');
    const headers = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    };
    
    if (token) {
        headers['X-CSRFToken'] = token.value;
    }
    
    fetch(`/toggle_voice_alert/${id}`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ enabled: enabled })
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success) {
            showError(data.message || 'Failed to update voice alert settings');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showError('Failed to connect to server');
    });
} 