/**
 * Progressive Login Flow Handler
 * 1. Validate credentials & send OTP
 * 2. Verify OTP & show milestones
    // Prevent default form submission

 * 3. Submit milestones & complete login
 */

let resendTimer = null;
let countdown = 60;
let availableMilestones = [];
const selectedMilestones = new Set();
const MAX_MILESTONES = 4;

// Load milestones on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/api/milestones');
        // Request OTP from server

        const data = await res.json();
        availableMilestones = data.milestones;
    } catch (err) {
        console.error('Failed to load milestones', err);
    }
});

/**
 * Step 1: Send OTP to Email
 */
async function sendOTP() {
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btn = document.getElementById('send-otp-btn');
    const errorDiv = document.getElementById('error-msg');
    const successDiv = document.getElementById('success-msg');

    // Validation
    if (!username || !email || !password) {
        showError('Please fill in all fields');
        return;
    }

    // Reset UI
    hideMessages();
    btn.disabled = true;
    btn.textContent = 'Sending OTP...';

    try {
        const response = await fetch('/api/auth/login/step1', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Show OTP Section
            showSuccess('OTP sent to your email! Check your inbox.');
            document.getElementById('otp-section').classList.add('visible');
            document.getElementById('otp').focus();
            startResendTimer();
            btn.textContent = 'OTP Sent ✓';
            btn.disabled = true;
        } else {
            showError(data.error || 'Failed to send OTP');
            btn.disabled = false;
            btn.textContent = 'Send OTP';
        }
    } catch (err) {
        showError('Network error. Please try again.');
        console.error(err);
        btn.disabled = false;
        btn.textContent = 'Send OTP';
    }
}

/**
 * Step 2: Verify OTP
 */
async function verifyOTP() {
    const email = document.getElementById('email').value.trim();
    const otp = document.getElementById('otp').value.trim();
    const btn = document.getElementById('verify-otp-btn');

    if (!otp || otp.length !== 6) {
        showError('Please enter a valid 6-digit OTP');
        return;
    }

    hideMessages();
    btn.disabled = true;
    btn.textContent = 'Verifying...';

    try {
        const response = await fetch('/api/auth/login/step2', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp })
        });

        const data = await response.json();

        if (response.ok) {
            // Store auth data temporarily
            window.tempAuthData = data;

            // Show milestone selection
            showSuccess('OTP verified! Please select your focus areas.');
            document.getElementById('milestone-section').classList.add('visible');
            renderMilestoneOptions();
            btn.textContent = 'Verified ✓';
            btn.disabled = true;

            if (resendTimer) clearInterval(resendTimer);
        } else {
            showError(data.error || 'Invalid OTP');
            btn.disabled = false;
            btn.textContent = 'Verify OTP';
        }
    } catch (err) {
        showError('Network error. Please try again.');
        console.error(err);
        btn.disabled = false;
        btn.textContent = 'Verify OTP';
    }
}

/**
 * Step 3: Complete Login with Milestones
 */
async function completeLogin() {
    if (selectedMilestones.size === 0) {
        showError('Please select at least one milestone');
        return;
    }

    const btn = document.getElementById('complete-login-btn');
    btn.disabled = true;
    btn.textContent = 'Completing...';

    try {
        // Update user preferences with selected milestones
        const response = await fetch('/api/auth/update-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.tempAuthData.token}`
            },
            body: JSON.stringify({
                preferences: {
                    selectedMilestones: Array.from(selectedMilestones)
                }
            })
        });

        if (response.ok) {
            // Store final auth data
            localStorage.setItem('token', window.tempAuthData.token);
            localStorage.setItem('user', JSON.stringify(window.tempAuthData.user));

            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        } else {
            // Even if preference update fails, still log in
            localStorage.setItem('token', window.tempAuthData.token);
            localStorage.setItem('user', JSON.stringify(window.tempAuthData.user));
            window.location.href = 'dashboard.html';
        }
    } catch (err) {
        // Fallback: Login anyway
        localStorage.setItem('token', window.tempAuthData.token);
        localStorage.setItem('user', JSON.stringify(window.tempAuthData.user));
        window.location.href = 'dashboard.html';
    }
}

/**
 * Render milestone options
 */
function renderMilestoneOptions() {
    const container = document.getElementById('milestone-options');
    container.innerHTML = availableMilestones.map(m => `
        <div class="milestone-option" 
             style="padding: 0.75rem; border-bottom: 1px solid var(--border-color); cursor: pointer; display: flex; justify-content: space-between; align-items: center;"
             onclick="toggleMilestone(${m.id}, this)">
             <div>
                <div style="font-weight: 600; font-size: 0.95rem;">${m.name}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">${m.topics.length} topics</div>
             </div>
             <span class="check-icon" style="color: var(--success); font-weight: bold; opacity: 0;">✓</span>
        </div>
    `).join('');
}

function toggleMilestone(id, el) {
    if (selectedMilestones.has(id)) {
        selectedMilestones.delete(id);
        el.querySelector('.check-icon').style.opacity = '0';
    } else {
        if (selectedMilestones.size >= MAX_MILESTONES) {
            showError(`You can select up to ${MAX_MILESTONES} milestones`);
            return;
        }
        selectedMilestones.add(id);
        el.querySelector('.check-icon').style.opacity = '1';
    }
    updateMilestoneCount();
}

function updateMilestoneCount() {
    document.getElementById('milestone-count').textContent = `${selectedMilestones.size}/${MAX_MILESTONES}`;
}

/**
 * Timer for resend OTP
 */
function startResendTimer() {
    countdown = 60;
    const timerSpan = document.getElementById('timer');
    const resendBtn = document.getElementById('resend-btn');

    resendBtn.style.display = 'none';
    timerSpan.style.display = 'inline';

    if (resendTimer) clearInterval(resendTimer);

    resendTimer = setInterval(() => {
        countdown--;
        timerSpan.textContent = `${countdown}s`;

        if (countdown <= 0) {
            clearInterval(resendTimer);
            timerSpan.style.display = 'none';
            resendBtn.style.display = 'inline-block';
        }
    }, 1000);
}

/**
 * UI Helper Functions
 */
function showError(message) {
    const errorDiv = document.getElementById('error-msg');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    document.getElementById('success-msg').style.display = 'none';
}

function showSuccess(message) {
    const successDiv = document.getElementById('success-msg');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    document.getElementById('error-msg').style.display = 'none';
}

function hideMessages() {
    document.getElementById('error-msg').style.display = 'none';
    document.getElementById('success-msg').style.display = 'none';
}
