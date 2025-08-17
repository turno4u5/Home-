let selectedPlatform = '';
let missions = {
    followers: { selected: false, count: 0, completed: 0 },
    likes: { selected: false, count: 0, completed: 0 },
    comments: { selected: false, count: 0, completed: 0 }
};
let followCompleted = false;

// Track used combinations to prevent duplicates
let usedCombinations = JSON.parse(localStorage.getItem('turnoUsedCombinations') || '{}');

const platformLinks = {
    instagram: 'https://www.instagram.com/imdannyc4u/',
    tiktok: 'https://www.tiktok.com/@dannycross443',
    youtube: 'https://www.youtube.com/@mami4u5'
};

function selectPlatform(platform) {
    // Reset everything when switching platforms
    selectedPlatform = platform;
    missions = {
        followers: { selected: false, count: 0, completed: 0 },
        likes: { selected: false, count: 0, completed: 0 },
        comments: { selected: false, count: 0, completed: 0 }
    };
    followCompleted = false;
    
    // Update followers usage counter
    updateFollowersUsageCounter();

    // Update platform card styles
    document.querySelectorAll('.platform-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.getElementById(platform + '-card').classList.add('selected');

    // Show username section and clear input
    document.getElementById('username-section').classList.remove('hidden');
    document.getElementById('username-input').value = '';
    
    // Hide other sections
    document.getElementById('missions-section').classList.add('hidden');
    document.getElementById('follow-section').classList.add('hidden');
    document.getElementById('send-section').classList.add('hidden');

    // Clear mission buttons and progress
    ['followers', 'likes', 'comments'].forEach(type => {
        document.getElementById(type + '-buttons').innerHTML = '';
        document.getElementById(type + '-progress').classList.add('hidden');
    });

    // Reset follow button and checkbox
    const followBtn = document.getElementById('follow-btn');
    followBtn.classList.remove('completed');
    followBtn.style.background = '';
    followBtn.innerHTML = `
        <span class="flex items-center justify-center">
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.5 6L12 10.5 8.5 8 12 5.5 15.5 8zM8.5 16L12 13.5 15.5 16 12 18.5 8.5 16z"/>
            </svg>
            Follow Account
        </span>
    `;
    
    // Reset checkbox
    const checkbox = document.getElementById('already-followed');
    if (checkbox) {
        checkbox.checked = false;
    }

    // Setup username input listener
    const usernameInput = document.getElementById('username-input');
    usernameInput.oninput = function() {
        if (this.value.trim()) {
            document.getElementById('video-links-section').classList.remove('hidden');
            showMissionsAndFollow();
            updateFollowersUsageCounter();
        } else {
            document.getElementById('video-links-section').classList.add('hidden');
            document.getElementById('missions-section').classList.add('hidden');
            document.getElementById('follow-section').classList.add('hidden');
            document.getElementById('send-section').classList.add('hidden');
            // Clear video link input
            document.getElementById('video-link').value = '';
            updateFollowersUsageCounter();
        }
    };

    // Setup video link validation
    const videoLinkInput = document.getElementById('video-link');
    videoLinkInput.oninput = function() {
        validateVideoLink();
    };
    videoLinkInput.onblur = function() {
        validateVideoLink();
    };
}

function showMissionsAndFollow() {
    document.getElementById('missions-section').classList.remove('hidden');
    document.getElementById('follow-section').classList.remove('hidden');
    
    // Update follow link
    const followLink = document.getElementById('follow-link');
    followLink.textContent = platformLinks[selectedPlatform];
    
    updateTotalProgress();
    checkSendButton();
}

function selectMission(type, count) {
    // Check if this mission is already selected with the same count
    if (missions[type].selected && missions[type].count === count) {
        // Double-click detected - deselect the mission
        missions[type].selected = false;
        missions[type].count = 0;
        missions[type].completed = 0;
        
        // Clear the mission buttons and hide progress
        document.getElementById(type + '-buttons').innerHTML = '';
        document.getElementById(type + '-progress').classList.add('hidden');
        
        // Update progress and check send button
        updateTotalProgress();
        checkSendButton();
        return;
    }
    
    const username = document.getElementById('username-input').value.trim().toLowerCase();
    const combinationKey = `${selectedPlatform}_${username}_${type}_${count}`;
    
    // Check if this combination has been used before ONLY for followers (within last 2 hours)
    if (type === 'followers') {
        cleanupExpiredEntries();
        const entry = usedCombinations[combinationKey];
        if (entry && typeof entry === 'object' && entry.timestamp) {
            showDuplicateModal(type);
            return;
        }
    }
    
    missions[type].selected = true;
    missions[type].count = count;
    missions[type].completed = 0;

    // Calculate button count (every 10 = 5 buttons)
    const buttonCount = Math.floor(count / 2);
    
    createMissionButtons(type, buttonCount);
    updateProgress(type);
    updateTotalProgress();
    checkSendButton();
}

function createMissionButtons(type, buttonCount) {
    const container = document.getElementById(type + '-buttons');
    container.innerHTML = '';

    for (let i = 1; i <= buttonCount; i++) {
        const button = document.createElement('button');
        button.className = 'action-button px-3 py-2 rounded-lg text-sm font-medium';
        button.textContent = `Task ${i}`;
        button.onclick = () => completeMissionAction(type, i, button);
        container.appendChild(button);
    }

    // Show progress bar
    document.getElementById(type + '-progress').classList.remove('hidden');
}

function completeMissionAction(type, actionNumber, button) {
    if (!button.classList.contains('completed')) {
        button.classList.add('completed');
        button.innerHTML = '✓ Done';
        missions[type].completed++;
        updateProgress(type);
        updateTotalProgress();
        checkSendButton();
    }
}

function updateProgress(type) {
    const progressFill = document.querySelector(`#${type}-progress .progress-fill`);
    const percentage = (missions[type].completed / Math.floor(missions[type].count / 2)) * 100;
    progressFill.style.width = percentage + '%';
}

function updateTotalProgress() {
    const selectedMissions = Object.values(missions).filter(m => m.selected);
    if (selectedMissions.length === 0) {
        document.getElementById('total-progress').textContent = '0%';
        return;
    }

    const totalTasks = selectedMissions.reduce((sum, m) => sum + Math.floor(m.count / 2), 0);
    const completedTasks = selectedMissions.reduce((sum, m) => sum + m.completed, 0);
    const percentage = Math.round((completedTasks / totalTasks) * 100);
    
    document.getElementById('total-progress').textContent = percentage + '%';
}

function validateVideoLink() {
    const videoLinkInput = document.getElementById('video-link');
    const errorDiv = document.getElementById('video-link-error');
    const value = videoLinkInput.value.trim();
    
    if (value && !isValidUrl(value)) {
        errorDiv.classList.remove('hidden');
        videoLinkInput.classList.add('border-red-500');
        videoLinkInput.classList.remove('border-white/20');
        return false;
    } else {
        errorDiv.classList.add('hidden');
        videoLinkInput.classList.remove('border-red-500');
        videoLinkInput.classList.add('border-white/20');
        return true;
    }
}

function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

function showWarningModal() {
    // Update modal content based on selected missions
    const selectedServices = [];
    if (missions.followers.selected) selectedServices.push('Follow');
    if (missions.likes.selected) selectedServices.push('Like');
    if (missions.comments.selected) selectedServices.push('Comment');
    
    const modalServices = document.getElementById('modal-services');
    modalServices.textContent = `(${selectedServices.join(', ')})`;
    
    document.getElementById('warning-modal').classList.remove('hidden');
}

function closeWarningModal() {
    document.getElementById('warning-modal').classList.add('hidden');
}

function showDuplicateModal(type) {
    const duplicateMissionType = document.getElementById('duplicate-mission-type');
    duplicateMissionType.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    
    // Find the earliest timestamp for this type to show countdown
    const username = document.getElementById('username-input').value.trim().toLowerCase();
    let earliestTimestamp = null;
    
    Object.keys(usedCombinations).forEach(key => {
        if (key.startsWith(`${selectedPlatform}_${username}_${type}_`)) {
            const entry = usedCombinations[key];
            if (entry && entry.timestamp) {
                if (!earliestTimestamp || entry.timestamp < earliestTimestamp) {
                    earliestTimestamp = entry.timestamp;
                }
            }
        }
    });
    
    // Start countdown timer
    if (earliestTimestamp) {
        startResetCountdown(earliestTimestamp);
    }
    
    document.getElementById('duplicate-modal').classList.remove('hidden');
}

function closeDuplicateModal() {
    document.getElementById('duplicate-modal').classList.add('hidden');
    // Clear the countdown timer
    if (window.countdownInterval) {
        clearInterval(window.countdownInterval);
    }
}

function showSuccessModal() {
    document.getElementById('success-modal').classList.remove('hidden');
}

function closeSuccessModal() {
    document.getElementById('success-modal').classList.add('hidden');
}

function startResetCountdown(timestamp) {
    const countdownElement = document.getElementById('reset-countdown');
    const twoHoursInMs = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
    
    // Clear any existing interval
    if (window.countdownInterval) {
        clearInterval(window.countdownInterval);
    }
    
    function updateCountdown() {
        const now = Date.now();
        const resetTime = timestamp + twoHoursInMs;
        const timeLeft = resetTime - now;
        
        if (timeLeft <= 0) {
            countdownElement.textContent = '00:00:00';
            countdownElement.classList.add('text-green-400');
            countdownElement.classList.remove('text-white');
            // Auto-close modal and refresh counter when timer reaches zero
            setTimeout(() => {
                closeDuplicateModal();
                updateFollowersUsageCounter();
            }, 1000);
            clearInterval(window.countdownInterval);
            return;
        }
        
        // Convert milliseconds to hours, minutes, seconds
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        // Format with leading zeros
        const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        countdownElement.textContent = formattedTime;
        countdownElement.classList.remove('text-green-400');
        countdownElement.classList.add('text-white');
    }
    
    // Update immediately and then every second
    updateCountdown();
    window.countdownInterval = setInterval(updateCountdown, 1000);
}

function followAccount() {
    showWarningModal();
    
    // Set a timeout to complete the follow action after modal is closed
    setTimeout(() => {
        window.open(platformLinks[selectedPlatform], '_blank');
        followCompleted = true;
        const followBtn = document.getElementById('follow-btn');
        followBtn.classList.add('completed');
        followBtn.style.background = 'linear-gradient(135deg, #059669, #10b981)';
        followBtn.innerHTML = `
            <span class="flex items-center justify-center">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path fill-rule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clip-rule="evenodd"/>
                </svg>
                Followed!
            </span>
        `;
        checkSendButton();
    }, 100);
}

function handleAlreadyFollowed() {
    const checkbox = document.getElementById('already-followed');
    if (checkbox.checked) {
        // Show warning modal
        showWarningModal();
        
        // Set a timeout to complete the action after modal is closed
        setTimeout(() => {
            // Mark follow as completed
            followCompleted = true;
            
            // Update button appearance
            const followBtn = document.getElementById('follow-btn');
            followBtn.classList.add('completed');
            followBtn.style.background = 'linear-gradient(135deg, #059669, #10b981)';
            followBtn.innerHTML = `
                <span class="flex items-center justify-center">
                    <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path fill-rule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clip-rule="evenodd"/>
                    </svg>
                    Confirmed!
                </span>
            `;
            
            // Disable the follow button since checkbox is checked
            followBtn.disabled = true;
            followBtn.style.opacity = '0.7';
            followBtn.style.cursor = 'not-allowed';
            
            // Check if send button should appear
            checkSendButton();
        }, 100);
    } else {
        // Reset follow status
        followCompleted = false;
        
        // Reset button appearance
        const followBtn = document.getElementById('follow-btn');
        followBtn.classList.remove('completed');
        followBtn.disabled = false;
        followBtn.style.background = '';
        followBtn.style.opacity = '1';
        followBtn.style.cursor = 'pointer';
        followBtn.innerHTML = `
            <span class="flex items-center justify-center">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.5 6L12 10.5 8.5 8 12 5.5 15.5 8zM8.5 16L12 13.5 15.5 16 12 18.5 8.5 16z"/>
                </svg>
                Follow Account
            </span>
        `;
        
        // Check if send button should be hidden
        checkSendButton();
    }
}

function checkSendButton() {
    const allMissionsCompleted = Object.values(missions).every(mission => 
        !mission.selected || mission.completed === Math.floor(mission.count / 2)
    );
    
    const anyMissionSelected = Object.values(missions).some(mission => mission.selected);
    
    if (allMissionsCompleted && anyMissionSelected && followCompleted) {
        document.getElementById('send-section').classList.remove('hidden');
    } else {
        document.getElementById('send-section').classList.add('hidden');
    }
}

function updateFollowersUsageCounter() {
    if (!selectedPlatform) return;
    
    const username = document.getElementById('username-input').value.trim().toLowerCase();
    if (!username) {
        document.getElementById('followers-used-count').textContent = '0';
        return;
    }
    
    // Clean up expired entries (older than 2 hours)
    cleanupExpiredEntries();
    
    // Count how many followers have been used for this platform and username within last 2 hours
    let totalUsed = 0;
    Object.keys(usedCombinations).forEach(key => {
        if (key.startsWith(`${selectedPlatform}_${username}_followers_`)) {
            const entry = usedCombinations[key];
            if (entry && typeof entry === 'object' && entry.timestamp) {
                const count = parseInt(key.split('_').pop());
                totalUsed += count;
            }
        }
    });
    
    document.getElementById('followers-used-count').textContent = totalUsed.toString();
}

function cleanupExpiredEntries() {
    const now = Date.now();
    const twoHoursInMs = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
    
    Object.keys(usedCombinations).forEach(key => {
        if (key.includes('_followers_')) {
            const entry = usedCombinations[key];
            
            // Handle old format (boolean) by converting to new format
            if (typeof entry === 'boolean') {
                // If it's old format, we can't know when it was created, so keep it for now
                // but convert it to new format with current timestamp
                usedCombinations[key] = {
                    timestamp: now,
                    used: true
                };
            } else if (entry && entry.timestamp) {
                // Check if entry is older than 2 hours
                if (now - entry.timestamp > twoHoursInMs) {
                    delete usedCombinations[key];
                }
            }
        }
    });
    
    // Save cleaned up data
    localStorage.setItem('turnoUsedCombinations', JSON.stringify(usedCombinations));
}

// Initialize send button event listener
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('send-btn').onclick = function() {
        // Save used combinations to prevent future duplicates ONLY for followers
        const username = document.getElementById('username-input').value.trim().toLowerCase();
        const now = Date.now();
        
        Object.keys(missions).forEach(type => {
            if (missions[type].selected && type === 'followers') {
                const combinationKey = `${selectedPlatform}_${username}_${type}_${missions[type].count}`;
                usedCombinations[combinationKey] = {
                    timestamp: now,
                    used: true
                };
            }
        });
        localStorage.setItem('turnoUsedCombinations', JSON.stringify(usedCombinations));
        
        // Update the counter after saving
        updateFollowersUsageCounter();
        
        // Show success modal instead of alert
        showSuccessModal();
    };
});