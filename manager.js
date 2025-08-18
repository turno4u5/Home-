import { db, subscriptions } from './src/supabase.js'

// Global state
let currentTab = 'submissions'
let submissions = []
let missions = []
let platformAccounts = []
let settings = []

// Initialize the manager
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check if Supabase is configured
        if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
            throw new Error('Supabase not configured. Please set up your Supabase connection.');
        }
        
        await initializeManager()
        hideLoadingOverlay()
    } catch (error) {
        console.error('Failed to initialize manager:', error)
        showConnectionError()
    }
})

async function initializeManager() {
    try {
        // Load initial data
        await Promise.all([
            loadSubmissions(),
            loadMissions(),
            loadPlatformAccounts(),
            loadSettings()
        ])

        // Setup real-time subscriptions
        setupRealtimeSubscriptions()

        // Update last updated time
        updateLastUpdatedTime()
    } catch (error) {
        console.error('Error during initialization:', error)
        throw error
    }
}

function hideLoadingOverlay() {
    document.getElementById('loading-overlay').classList.add('hidden')
}

function showConnectionError() {
    const overlay = document.getElementById('loading-overlay')
    overlay.innerHTML = `
        <div class="bg-gray-800 rounded-lg p-8 text-center">
            <div class="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 15v-2h2v2h-2zm0-4V7h2v6h-2z"/>
                </svg>
            </div>
            <p class="text-lg text-red-400 mb-2">Connection Failed</p>
            <p class="text-sm text-gray-400 mb-4">Please set up your Supabase connection</p>
            <button onclick="location.reload()" class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg">
                Retry Connection
            </button>
        </div>
    `
    
    // Update connection status
    const statusEl = document.getElementById('connection-status')
    statusEl.innerHTML = `
        <div class="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
        <span class="text-sm text-red-400">Disconnected</span>
    `
}

// Tab management
function showTab(tabName) {
    // Update active tab button
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'))
    document.getElementById(`tab-${tabName}`).classList.add('active')

    // Show/hide tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'))
    document.getElementById(`${tabName}-tab`).classList.remove('hidden')

    currentTab = tabName
}

// Submissions management
async function loadSubmissions() {
    try {
        submissions = await db.getSubmissions()
        renderSubmissions()
        updateSubmissionsCount()
    } catch (error) {
        console.error('Failed to load submissions:', error)
    }
}

function renderSubmissions() {
    const tbody = document.getElementById('submissions-table')
    
    if (submissions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-4 py-8 text-center text-gray-400">
                    No submissions yet. Users will appear here when they complete missions.
                </td>
            </tr>
        `
        return
    }

    tbody.innerHTML = submissions.map(submission => `
        <tr class="hover:bg-gray-700">
            <td class="px-4 py-3">
                <div class="text-sm">${formatDate(submission.submitted_at)}</div>
                <div class="text-xs text-gray-400">${formatTime(submission.submitted_at)}</div>
            </td>
            <td class="px-4 py-3">
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPlatformColor(submission.platform)}">
                    ${getPlatformIcon(submission.platform)}
                    ${submission.platform}
                </span>
            </td>
            <td class="px-4 py-3">
                <div class="font-medium">${submission.username}</div>
            </td>
            <td class="px-4 py-3">
                ${submission.video_link ? `
                    <a href="${submission.video_link}" target="_blank" class="text-blue-400 hover:text-blue-300 text-sm truncate block max-w-xs">
                        ${submission.video_link}
                    </a>
                ` : '<span class="text-gray-400">No link</span>'}
            </td>
            <td class="px-4 py-3">
                <div class="text-sm">${formatMissions(submission.missions_data)}</div>
            </td>
            <td class="px-4 py-3">
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${submission.follow_completed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${submission.follow_completed ? '✓ Followed' : '✗ Not Followed'}
                </span>
            </td>
            <td class="px-4 py-3">
                <button onclick="deleteSubmission('${submission.id}')" class="text-red-400 hover:text-red-300 text-sm">
                    Delete
                </button>
            </td>
        </tr>
    `).join('')
}

function updateSubmissionsCount() {
    document.getElementById('submissions-count').textContent = submissions.length
}

async function deleteSubmission(id) {
    if (!confirm('Are you sure you want to delete this submission?')) return
    
    try {
        await db.deleteSubmission(id)
        submissions = submissions.filter(s => s.id !== id)
        renderSubmissions()
        updateSubmissionsCount()
    } catch (error) {
        console.error('Failed to delete submission:', error)
        alert('Failed to delete submission')
    }
}

async function refreshSubmissions() {
    await loadSubmissions()
    updateLastUpdatedTime()
}

function exportSubmissions() {
    if (submissions.length === 0) {
        alert('No submissions to export')
        return
    }

    const csv = [
        ['Date', 'Time', 'Platform', 'Username', 'Video Link', 'Missions', 'Follow Status', 'IP Address'],
        ...submissions.map(s => [
            formatDate(s.submitted_at),
            formatTime(s.submitted_at),
            s.platform,
            s.username,
            s.video_link || '',
            formatMissions(s.missions_data),
            s.follow_completed ? 'Followed' : 'Not Followed',
            s.ip_address || ''
        ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `turno-submissions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
}

// Mission management
async function loadMissions() {
    try {
        missions = await db.getMissions()
        renderMissions()
    } catch (error) {
        console.error('Failed to load missions:', error)
    }
}

function renderMissions() {
    const types = ['followers', 'likes', 'comments']
    
    types.forEach(type => {
        const container = document.getElementById(`${type}-missions`)
        const typeMissions = missions.filter(m => m.type === type)
        
        container.innerHTML = typeMissions.map(mission => `
            <div class="mission-item ${!mission.enabled ? 'disabled' : ''}">
                <div class="flex items-center">
                    <span class="font-medium">${mission.count} ${type}</span>
                    ${!mission.enabled ? '<span class="ml-2 text-xs text-gray-400">(Disabled)</span>' : ''}
                </div>
                <div class="flex items-center space-x-2">
                    <button onclick="toggleMission('${mission.id}', ${!mission.enabled})" 
                            class="text-xs px-2 py-1 rounded ${mission.enabled ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}">
                        ${mission.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button onclick="deleteMission('${mission.id}')" class="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 rounded">
                        Delete
                    </button>
                </div>
            </div>
        `).join('')
    })
}

async function toggleMission(id, enabled) {
    try {
        await db.updateMission(id, { enabled })
        await loadMissions()
    } catch (error) {
        console.error('Failed to toggle mission:', error)
        alert('Failed to update mission')
    }
}

async function deleteMission(id) {
    if (!confirm('Are you sure you want to delete this mission?')) return
    
    try {
        await db.deleteMission(id)
        await loadMissions()
    } catch (error) {
        console.error('Failed to delete mission:', error)
        alert('Failed to delete mission')
    }
}

function showAddMissionModal() {
    document.getElementById('add-mission-modal').classList.remove('hidden')
}

function hideAddMissionModal() {
    document.getElementById('add-mission-modal').classList.add('hidden')
    document.getElementById('add-mission-form').reset()
}

// Add mission form handler
document.getElementById('add-mission-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const type = document.getElementById('mission-type').value
    const count = parseInt(document.getElementById('mission-count').value)
    const enabled = document.getElementById('mission-enabled').checked
    
    try {
        await db.createMission({ type, count, enabled })
        await loadMissions()
        hideAddMissionModal()
    } catch (error) {
        console.error('Failed to create mission:', error)
        alert('Failed to create mission')
    }
})

// Platform accounts management
async function loadPlatformAccounts() {
    try {
        platformAccounts = await db.getPlatformAccounts()
        renderPlatformAccounts()
    } catch (error) {
        console.error('Failed to load platform accounts:', error)
    }
}

function renderPlatformAccounts() {
    const container = document.getElementById('platform-accounts')
    
    container.innerHTML = platformAccounts.map(account => `
        <div class="platform-card">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold capitalize">${account.platform}</h3>
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${account.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${account.enabled ? 'Active' : 'Inactive'}
                </span>
            </div>
            
            <div class="mb-4">
                <label class="block text-sm font-medium mb-2">Account URL</label>
                <input type="url" value="${account.account_url}" 
                       onchange="updatePlatformAccount('${account.id}', 'account_url', this.value)"
                       class="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-sm">
            </div>
            
            <div class="mb-4">
                <label class="block text-sm font-medium mb-2">Account Name</label>
                <input type="text" value="${account.account_name || ''}" 
                       onchange="updatePlatformAccount('${account.id}', 'account_name', this.value)"
                       class="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-sm">
            </div>
            
            <div class="flex items-center justify-between">
                <label class="flex items-center">
                    <input type="checkbox" ${account.enabled ? 'checked' : ''} 
                           onchange="updatePlatformAccount('${account.id}', 'enabled', this.checked)"
                           class="mr-2">
                    <span class="text-sm">Enabled</span>
                </label>
                
                <a href="${account.account_url}" target="_blank" class="text-blue-400 hover:text-blue-300 text-sm">
                    View Account →
                </a>
            </div>
        </div>
    `).join('')
}

async function updatePlatformAccount(id, field, value) {
    try {
        await db.updatePlatformAccount(id, { [field]: value })
        await loadPlatformAccounts()
    } catch (error) {
        console.error('Failed to update platform account:', error)
        alert('Failed to update account')
    }
}

// Settings management
async function loadSettings() {
    try {
        settings = await db.getSettings()
        renderSettings()
    } catch (error) {
        console.error('Failed to load settings:', error)
    }
}

function renderSettings() {
    const container = document.getElementById('settings-container')
    
    const settingsConfig = {
        'reset_timer_hours': {
            label: 'Reset Timer (Hours)',
            description: 'Hours before users can reuse the same mission count',
            type: 'number',
            min: 1,
            max: 24
        },
        'max_daily_submissions': {
            label: 'Max Daily Submissions',
            description: 'Maximum submissions per user per day',
            type: 'number',
            min: 1,
            max: 100
        },
        'maintenance_mode': {
            label: 'Maintenance Mode',
            description: 'Enable to temporarily disable the website',
            type: 'boolean'
        }
    }
    
    container.innerHTML = Object.entries(settingsConfig).map(([key, config]) => {
        const setting = settings.find(s => s.setting_key === key)
        const value = setting ? setting.setting_value : ''
        
        return `
            <div class="setting-item">
                <div class="flex items-center justify-between mb-2">
                    <h3 class="text-lg font-semibold">${config.label}</h3>
                    ${config.type === 'boolean' ? `
                        <label class="flex items-center">
                            <input type="checkbox" ${value === 'true' ? 'checked' : ''} 
                                   onchange="updateSetting('${key}', this.checked.toString())"
                                   class="mr-2">
                            <span class="text-sm">${value === 'true' ? 'Enabled' : 'Disabled'}</span>
                        </label>
                    ` : ''}
                </div>
                
                <p class="text-sm text-gray-400 mb-3">${config.description}</p>
                
                ${config.type !== 'boolean' ? `
                    <input type="${config.type}" value="${value}" 
                           min="${config.min || ''}" max="${config.max || ''}"
                           onchange="updateSetting('${key}', this.value)"
                           class="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2">
                ` : ''}
            </div>
        `
    }).join('')
}

async function updateSetting(key, value) {
    try {
        await db.updateSetting(key, value)
        await loadSettings()
    } catch (error) {
        console.error('Failed to update setting:', error)
        alert('Failed to update setting')
    }
}

// Real-time subscriptions
function setupRealtimeSubscriptions() {
    // Subscribe to new submissions
    subscriptions.onSubmissions((payload) => {
        console.log('Real-time update:', payload)
        
        if (payload.eventType === 'INSERT') {
            submissions.unshift(payload.new)
            renderSubmissions()
            updateSubmissionsCount()
            
            // Add visual indicator for new submission
            const firstRow = document.querySelector('#submissions-table tr')
            if (firstRow) {
                firstRow.classList.add('new-submission')
                setTimeout(() => firstRow.classList.remove('new-submission'), 3000)
            }
        } else if (payload.eventType === 'DELETE') {
            submissions = submissions.filter(s => s.id !== payload.old.id)
            renderSubmissions()
            updateSubmissionsCount()
        }
        
        updateLastUpdatedTime()
    })

    // Subscribe to mission changes
    subscriptions.onMissions((payload) => {
        loadMissions()
        updateLastUpdatedTime()
    })

    // Subscribe to platform account changes
    subscriptions.onPlatformAccounts((payload) => {
        loadPlatformAccounts()
        updateLastUpdatedTime()
    })
}

// Utility functions
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString()
}

function formatTime(dateString) {
    return new Date(dateString).toLocaleTimeString()
}

function formatMissions(missionsData) {
    if (!missionsData || typeof missionsData !== 'object') return 'None'
    
    const missions = []
    Object.entries(missionsData).forEach(([type, data]) => {
        if (data.selected && data.count > 0) {
            missions.push(`${data.count} ${type}`)
        }
    })
    
    return missions.length > 0 ? missions.join(', ') : 'None'
}

function getPlatformColor(platform) {
    const colors = {
        instagram: 'bg-pink-100 text-pink-800',
        tiktok: 'bg-purple-100 text-purple-800',
        youtube: 'bg-red-100 text-red-800'
    }
    return colors[platform] || 'bg-gray-100 text-gray-800'
}

function getPlatformIcon(platform) {
    const icons = {
        instagram: '📷',
        tiktok: '🎵',
        youtube: '📺'
    }
    return icons[platform] || '📱'
}

function updateLastUpdatedTime() {
    document.getElementById('last-updated').textContent = 
        `Last updated: ${new Date().toLocaleTimeString()}`
}

// Make functions globally available
window.showTab = showTab
window.refreshSubmissions = refreshSubmissions
window.exportSubmissions = exportSubmissions
window.deleteSubmission = deleteSubmission
window.toggleMission = toggleMission
window.deleteMission = deleteMission
window.showAddMissionModal = showAddMissionModal
window.hideAddMissionModal = hideAddMissionModal
window.updatePlatformAccount = updatePlatformAccount
window.updateSetting = updateSetting