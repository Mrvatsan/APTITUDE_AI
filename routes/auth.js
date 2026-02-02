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
const { User } = require('../models/index');



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
        res.status(500).json({ error: 'Registration failed: ' + err.message });
    }
});

// ==========================================
// 2-Step Authentication Endpoints
// ==========================================

// OTP-based authentication imports

const redisClient = require('../utils/redisClient');
const { sendOTP } = require('../utils/emailService');

/**
 * Login Step 1: Validate credentials and send OTP.
 * @route POST /api/auth/login/step1
 */
router.post('/login/step1', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    try {
        // Find user by EMAIL (mandatory for OTP)
        const user = await User.findOne({ where: { email } });

        if (!user) {
            // Security: Don't reveal if user exists or not, but for UX we might need to be specific?
            // "Accept Aptirise email + Aptirise password"
            console.warn(`[Auth] Step 1 failed: Email "${email}" not found`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
            console.warn(`[Auth] Step 1 failed: Incorrect password for "${email}"`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store in Redis (Expires in 5 minutes = 300 seconds)
        // If Redis unavailable, use in-memory fallback
        const redisKey = `otp:${email}`;
        try {
            await redisClient.setEx(redisKey, 300, otp);
            console.log(`[Auth] OTP stored in Redis for ${email}`);
        } catch (redisErr) {
            console.warn('[Auth] Redis unavailable, using in-memory OTP storage');
            if (!global.otpStore) global.otpStore = {};
            global.otpStore[email] = { otp, expiresAt: Date.now() + 300000 };
        }

        // Send OTP Email
        try {
            await sendOTP(email, otp, user.username);
        } catch (emailErr) {
            console.error('[Auth] Failed to send email:', emailErr);
            return res.status(500).json({ error: 'Failed to send verification code. Please try again.' });
        }

        console.log(`[Auth] OTP sent to ${email}`);
        res.json({ message: 'Verification code sent to your email' });

    } catch (err) {
        console.error('[Auth] Login Step 1 error:', err);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

/**
 * Login Step 2: Verify OTP and issue token.
 * @route POST /api/auth/login/step2
 */
router.post('/login/step2', async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ error: 'Email and valid OTP required' });
    }

    try {
        const redisKey = `otp:${email}`;
        let storedOtp;

        // Try Redis first, fallback to in-memory
        try {
            storedOtp = await redisClient.get(redisKey);
        } catch (redisErr) {
            console.warn('[Auth] Redis unavailable, checking in-memory store');
            const memStore = global.otpStore && global.otpStore[email];
            if (memStore && memStore.expiresAt > Date.now()) {
                storedOtp = memStore.otp;
            }
        }

        if (!storedOtp) {
            return res.status(400).json({ error: 'Verification code expired or invalid' });
        }

        if (storedOtp !== otp) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        // OTP Valid - Clean up
        try {
            await redisClient.del(redisKey);
        } catch (err) {
            // Clean up in-memory if Redis fails
            if (global.otpStore && global.otpStore[email]) {
                delete global.otpStore[email];
            }
        }

        // Fetch user to generate token
        const user = await User.findOne({ where: { email } });

        if (!user) {
            // Should not happen if Step 1 passed and data integrity holds
            return res.status(500).json({ error: 'User record not found' });
        }

        // Update functionality (Streaks etc) matches original login flow
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
            await user.save();
        }

        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log(`[Auth] User ${user.username} logged in successfully via 2FA`);

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
        console.error('[Auth] Login Step 2 error:', err);
        res.status(500).json({ error: 'Verification failed. Please try again.' });
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

        // Calculate progress within current tier
        const currentTier = BADGE_TIERS.find(t => t.name === currentBadge);
        const xpInCurrentTier = user.totalXP - currentTier.minXP;
        const tierRange = currentTier.maxXP === Infinity ? 10000 : (currentTier.maxXP - currentTier.minXP + 1); // +1 because inclusive

        // Calculate average accuracy
        const avgAccuracy = user.sessionsCompleted > 0
            ? Math.round(user.totalAccuracySum / user.sessionsCompleted)
            : 0;

        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            totalXP: user.totalXP,
            currentBadge: currentBadge,
            streakCount: user.streakCount,
            preferences: user.preferences,
            stats: {
                sessionsCompleted: user.sessionsCompleted,
                avgAccuracy: avgAccuracy
            },
            badgeProgress: {
                current: currentBadge,
                currentXP: user.totalXP,
                xpInCurrentTier,
                tierRange,
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
 * Updates user profile details.
 * @route POST /api/auth/update-profile
 */
router.post('/update-profile', authMiddleware, async (req, res) => {
    const { username, email } = req.body;

    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (username) user.username = username;
        if (email) user.email = email;

        await user.save();

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                totalXP: user.totalXP,
                currentBadge: getBadge(user.totalXP),
                streakCount: user.streakCount,
                preferences: user.preferences
            }
        });
    } catch (err) {
        console.error('[Auth] Profile update error:', err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

/**
 * Updates the user's total XP and checks for badge upgrades.
 * @route POST /api/auth/update-xp
 */
router.post('/update-xp', authMiddleware, async (req, res) => {
    const { xpGained, accuracy } = req.body;

    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const oldBadge = getBadge(user.totalXP);
        user.totalXP += xpGained;

        // Update session stats if accuracy is provided (implies a session finished)
        if (accuracy !== undefined) {
            user.sessionsCompleted = (user.sessionsCompleted || 0) + 1;
            user.totalAccuracySum = (user.totalAccuracySum || 0) + accuracy;
        }

        // Save updated XP to database
        await user.save();

        const newBadge = getBadge(user.totalXP);

        const badgeUpgrade = oldBadge !== newBadge;

        const nextBadgeInfo = getNextBadgeInfo(user.totalXP);
        const currentTier = BADGE_TIERS.find(t => t.name === newBadge);
        const xpInCurrentTier = user.totalXP - currentTier.minXP;
        const tierRange = currentTier.maxXP === Infinity ? 10000 : (currentTier.maxXP - currentTier.minXP + 1);

        console.log(`[Auth] XP updated for user ${user.username}: +${xpGained} XP (Total: ${user.totalXP})`);
        if (badgeUpgrade) {
            console.log(`[Auth] Badge upgrade for ${user.username}: ${oldBadge} -> ${newBadge}`);
        }

        res.json({
            totalXP: user.totalXP,
            currentBadge: newBadge,
            badgeUpgrade,
            previousBadge: badgeUpgrade ? oldBadge : null,
            badgeProgress: {
                current: newBadge,
                currentXP: user.totalXP,
                xpInCurrentTier,
                tierRange,
                nextBadge: nextBadgeInfo.nextBadge,
                xpToNext: nextBadgeInfo.xpToNext
            }
        });
    } catch (err) {
        console.error('[Auth] XP update error:', err);
        res.status(500).json({ error: 'Failed to update XP' });
    }
});

module.exports = router;

// Registration logic validation

// Login security checks

// Profile retrieval optimization

// Badge calculation logic

// Registration logic validation

// Login security checks

// Profile retrieval optimization

// Badge calculation logic
