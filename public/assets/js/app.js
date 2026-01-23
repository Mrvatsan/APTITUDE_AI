/**
 * Aptitude Master - Core Client Application Logic
 * 
 * Manages UI state, practice session flow, result processing, 
 * and persistent profile updates in the browser.
 * 
 * @author Aptitude AI Team
 * @version 1.0.0
 */

/**
 * Base URL for all backend API endpoints.
 */
const API_BASE = '/api';

/**
 * Global application state manager.
 * Handles user authentication state and active practice sessions.
 */
const AppState = {
    user: null,
    session: null,

    /**
     * Initializes the application state by loading user and session 
     * data from local storage.
     */
    init() {
        const userStr = localStorage.getItem('user');
        const sessionStr = localStorage.getItem('currentSession');
        this.user = userStr ? JSON.parse(userStr) : null;
        this.session = sessionStr ? JSON.parse(sessionStr) : null;
    },

    setUser(user) {
        this.user = user;
        localStorage.setItem('user', JSON.stringify(user));
    },

    setSession(session) {
        this.session = session;
        localStorage.setItem('currentSession', JSON.stringify(session));
    },

    clearSession() {
        this.session = null;
        localStorage.removeItem('currentSession');
    },

    getToken() {
        return localStorage.getItem('token');
    },

    setToken(token) {
        localStorage.setItem('token', token);
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('currentSession');
        this.user = null;
        this.session = null;
    }
};

// API wrapper functions
const API = {
    async get(endpoint) {
        const token = AppState.getToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(API_BASE + endpoint, { headers });
        return res.json();
    },

    async post(endpoint, body) {
        const token = AppState.getToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(API_BASE + endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });
        return res.json();
    }
};

// Badge helpers
const BadgeHelpers = {
    tiers: [
        { name: 'Iron', minXP: 0, maxXP: 499 },
        { name: 'Bronze', minXP: 500, maxXP: 1499 },
        { name: 'Silver', minXP: 1500, maxXP: 3499 },
        { name: 'Gold', minXP: 3500, maxXP: 6999 },
        { name: 'Elite', minXP: 7000, maxXP: 11999 },
        { name: 'Expert', minXP: 12000, maxXP: 19999 },
        { name: 'Master', minXP: 20000, maxXP: Infinity }
    ],

    emojis: {
        Iron: '🛡️',
        Bronze: '🥉',
        Silver: '🥈',
        Gold: '🥇',
        Elite: '💎',
        Expert: '🌟',
        Master: '👑'
    },

    getBadge(xp) {
        for (const tier of this.tiers) {
            if (xp >= tier.minXP && xp <= tier.maxXP) return tier.name;
        }
        return 'Iron';
    },

    getEmoji(badge) {
        return this.emojis[badge] || '🛡️';
    },

    getProgress(xp) {
        const currentTier = this.tiers.find(t => xp >= t.minXP && xp <= t.maxXP);
        const nextTier = this.tiers.find(t => t.minXP > xp);

        if (!nextTier) return { progress: 100, xpToNext: 0 };

        const xpInTier = xp - currentTier.minXP;
        const tierRange = nextTier.minXP - currentTier.minXP;

        return {
            progress: Math.round((xpInTier / tierRange) * 100),
            xpToNext: nextTier.minXP - xp,
            nextBadge: nextTier.name
        };
    }
};

// Confetti animation
function triggerConfetti(container = document.body) {
    const confettiContainer = document.createElement('div');
    confettiContainer.className = 'confetti-container';
    confettiContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:1000;';
    container.appendChild(confettiContainer);

    const colors = ['#6366f1', '#22d3ee', '#f472b6', '#fbbf24', '#10b981'];

    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
      position: absolute;
      width: 10px;
      height: 10px;
      left: ${Math.random() * 100}%;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
      animation: confetti-fall 3s ease-out forwards;
      animation-delay: ${Math.random() * 2}s;
    `;
        confettiContainer.appendChild(confetti);
    }

    // Add keyframes if not present
    if (!document.getElementById('confetti-keyframes')) {
        const style = document.createElement('style');
        style.id = 'confetti-keyframes';
        style.textContent = `
      @keyframes confetti-fall {
        0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
      }
    `;
        document.head.appendChild(style);
    }

    setTimeout(() => confettiContainer.remove(), 5000);
}

// Initialize state on page load
document.addEventListener('DOMContentLoaded', () => {
    AppState.init();
});

// Export for use in other scripts
window.AppState = AppState;
window.API = API;
window.BadgeHelpers = BadgeHelpers;
window.triggerConfetti = triggerConfetti;
