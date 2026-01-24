/**
 * Authentication Routes
 * 
 * Provides API endpoints for user registration, login, 
 * and profile retrieval.
 * 
 * @author Aptitude AI Team
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const authMiddleware = require('../middleware/auth');

// In-memory user store
// FIXME: Replace with persistent storage (SQLite/Sequelize) for production use
const users = {};
let userIdCounter = 1;

// Badge tiers
const BADGE_TIERS = [
    { name: 'Iron', minXP: 0, maxXP: 499 },
    { name: 'Bronze', minXP: 500, maxXP: 1499 },
    { name: 'Silver', minXP: 1500, maxXP: 3499 },
    { name: 'Gold', minXP: 3500, maxXP: 6999 },
    { name: 'Elite', minXP: 7000, maxXP: 11999 },
    { name: 'Expert', minXP: 12000, maxXP: 19999 },
    { name: 'Master', minXP: 20000, maxXP: Infinity }
];

/**
 * Determines the badge name based on accumulated XP.
 * @param {number} xp - The total experience points of the user.
 * @returns {string} The name of the earned badge tier.
 */
function getBadge(xp) {
    for (const tier of BADGE_TIERS) {
        if (xp >= tier.minXP && xp <= tier.maxXP) return tier.name;
    }
    return 'Iron';
}

// ==========================================
// Authentication Endpoints
// ==========================================

/**
 * User registration endpoint.
 * @route POST /api/auth/register
 */
router.post('/register', async (req, res) => {
    const { username, email, password, goal, selectedMilestones } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    // Check if username exists
    const existingUser = Object.values(users).find(u => u.username === username);
    if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = userIdCounter++;

    users[userId] = {
        id: userId,
        username,
        email: email || null,
        passwordHash,
        totalXP: 0,
        currentBadge: 'Iron',
        streakCount: 0,
        lastActiveDate: null,
        preferences: {
            goal: goal || 'placements',
            selectedMilestones: selectedMilestones || [1, 2, 3]
        },
        createdAt: new Date().toISOString()
    };

    const token = jwt.sign(
        { id: userId, username },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    res.json({
        message: 'Registration successful',
        token,
        user: {
            id: userId,
            username,
            totalXP: 0,
            currentBadge: 'Iron',
            streakCount: 0
        }
    });
    console.log(`[Auth] New user registered: ${username}`);
});

/**
 * User login endpoint.
 * @route POST /api/auth/login
 */
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    const user = Object.values(users).find(u => u.username === username);
    if (!user) {
        console.warn(`[Auth] Failed login attempt: User "${username}" not found`);
        return res.status(401).json({ error: 'Account not found. Please check your username or register.' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
        console.warn(`[Auth] Failed login attempt: Incorrect password for user "${username}"`);
        return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    // Update streak logic
    const today = new Date().toDateString();
    const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate).toDateString() : null;

    if (lastActive !== today) {
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        if (lastActive === yesterday) {
            user.streakCount++;
        } else if (lastActive !== today) {
            user.streakCount = 1; // Reset streak
        }
        user.lastActiveDate = new Date().toISOString();
    }

    const token = jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    res.json({
        token,
        user: {
            id: user.id,
            username: user.username,
            totalXP: user.totalXP,
            currentBadge: user.currentBadge,
            streakCount: user.streakCount,
            preferences: user.preferences
        }
    });
});

/**
 * Retrieves the current authenticated user's profile.
 * @route GET /api/auth/profile
 */
router.get('/profile', authMiddleware, (req, res) => {
    const user = users[req.user.id];
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        totalXP: user.totalXP,
        currentBadge: user.currentBadge,
        streakCount: user.streakCount,
        preferences: user.preferences,
        badgeProgress: {
            current: user.currentBadge,
            currentXP: user.totalXP,
            nextBadge: BADGE_TIERS.find(t => t.minXP > user.totalXP)?.name || 'Master',
            xpToNext: BADGE_TIERS.find(t => t.minXP > user.totalXP)?.minXP - user.totalXP || 0
        }
    });
});

/**
 * Updates the user's total XP and checks for badge upgrades.
 * @route POST /api/auth/update-xp
 */
router.post('/update-xp', authMiddleware, (req, res) => {
    const { xpGained } = req.body;
    const user = users[req.user.id];

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    const oldBadge = user.currentBadge;
    user.totalXP += xpGained;
    user.currentBadge = getBadge(user.totalXP);

    const badgeUpgrade = oldBadge !== user.currentBadge;

    res.json({
        totalXP: user.totalXP,
        currentBadge: user.currentBadge,
        badgeUpgrade,
        previousBadge: badgeUpgrade ? oldBadge : null
    });
});

module.exports = router;
