/**
 * Authentication Routes
 * 
 * Provides API endpoints for user registration, login, 
 * and profile retrieval with SQLite database persistence.
 * 
 * @author Aptitude AI Team
 * @version 1.1.0
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const authMiddleware = require('../middleware/auth');
const User = require('../models/user');



// Badge tiers with updated XP thresholds
// Iron: 500 XP target, Silver: 2000 XP, Gold: 4500 XP, Elite: 7000 XP, Expert: 9500 XP, Master: 12000 XP
const BADGE_TIERS = [
    { name: 'Iron', minXP: 0, maxXP: 499 },
    { name: 'Silver', minXP: 500, maxXP: 1999 },
    { name: 'Gold', minXP: 2000, maxXP: 4499 },
    { name: 'Elite', minXP: 4500, maxXP: 6999 },
    { name: 'Expert', minXP: 7000, maxXP: 9499 },
    { name: 'Master', minXP: 9500, maxXP: Infinity }
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

/**
 * Gets the next badge info for progress display.
 * @param {number} xp - Current XP
 * @returns {object} Next badge name and XP required
 */
function getNextBadgeInfo(xp) {
    const nextTier = BADGE_TIERS.find(t => t.minXP > xp);
    if (nextTier) {
        return {
            nextBadge: nextTier.name,
            xpToNext: nextTier.minXP - xp
        };
    }
    return { nextBadge: 'Master', xpToNext: 0 };
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

    try {
        // Check if username exists in database
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already taken' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        // Create user in SQLite database
        const newUser = await User.create({
            username,
            email: email || null,
            passwordHash,
            totalXP: 0,
            streakCount: 0,
            lastActiveDate: null,
            preferences: {
                goal: goal || 'placements',
                selectedMilestones: selectedMilestones || [1, 2, 3]
            }
        });

        const token = jwt.sign(
            { id: newUser.id, username: newUser.username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Registration successful',
            token,
            user: {
                id: newUser.id,
                username: newUser.username,
                totalXP: newUser.totalXP,
                currentBadge: getBadge(newUser.totalXP),
                streakCount: newUser.streakCount,
                preferences: newUser.preferences
            }
        });
        console.log(`[Auth] New user registered: ${username}`);
    } catch (err) {
        console.error('[Auth] Registration error:', err);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
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

    try {
        // Find user in database
        const user = await User.findOne({ where: { username } });
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
            await user.save(); // Persist streak update to database
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
                currentBadge: getBadge(user.totalXP),
                streakCount: user.streakCount,
                preferences: user.preferences
            }
        });
    } catch (err) {
        console.error('[Auth] Login error:', err);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

/**
 * Retrieves the current authenticated user's profile.
 * @route GET /api/auth/profile
 */
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const currentBadge = getBadge(user.totalXP);
        const nextBadgeInfo = getNextBadgeInfo(user.totalXP);

        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            totalXP: user.totalXP,
            currentBadge: currentBadge,
            streakCount: user.streakCount,
            preferences: user.preferences,
            badgeProgress: {
                current: currentBadge,
                currentXP: user.totalXP,
                nextBadge: nextBadgeInfo.nextBadge,
                xpToNext: nextBadgeInfo.xpToNext
            }
        });
    } catch (err) {
        console.error('[Auth] Profile fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

/**
 * Updates the user's total XP and checks for badge upgrades.
 * @route POST /api/auth/update-xp
 */
router.post('/update-xp', authMiddleware, async (req, res) => {
    const { xpGained } = req.body;

    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const oldBadge = getBadge(user.totalXP);
        user.totalXP += xpGained;

        // Save updated XP to database
        await user.save();

        const newBadge = getBadge(user.totalXP);

        const badgeUpgrade = oldBadge !== newBadge;

        console.log(`[Auth] XP updated for user ${user.username}: +${xpGained} XP (Total: ${user.totalXP})`);
        if (badgeUpgrade) {
            console.log(`[Auth] Badge upgrade for ${user.username}: ${oldBadge} -> ${newBadge}`);
        }

        res.json({
            totalXP: user.totalXP,
            currentBadge: newBadge,
            badgeUpgrade,
            previousBadge: badgeUpgrade ? oldBadge : null
        });
    } catch (err) {
        console.error('[Auth] XP update error:', err);
        res.status(500).json({ error: 'Failed to update XP' });
    }
});

module.exports = router;
