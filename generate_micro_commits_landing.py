import os
import subprocess
import time
import shutil

# Files to manage
files = {
    'routes/session.js': """/**
 * Session Routes
 * 
 * API endpoints for managing practice sessions, fetching questions, 
 * recording answers, and calculating results.
 * 
 * @author Aptitude AI Team
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const aiGenerator = require('../utils/aiGenerator');
const authMiddleware = require('../middleware/auth');
const { Session, User } = require('../models/index');
const { Op } = require('sequelize');

// In-memory store for active sessions (persisted to DB on completion)
const sessions = {};

/**
 * Initializes a new practice session for a specific topic.
 * @route POST /api/session/start
 */
router.post('/start', authMiddleware, async (req, res) => {
    let { topicId, topicName, milestoneName, numQuestions, difficulty } = req.body;
    const userId = req.user.id;

    try {
        // Auto-detect session size if not specified or explicitly 'auto'
        if (!numQuestions || numQuestions === 'auto') {
            const historyCount = await Session.count({ where: { userId } });

            if (historyCount < 10) {
                numQuestions = 5; // Beginner
            } else if (historyCount < 25) {
                numQuestions = 10; // Intermediate
            } else {
                numQuestions = 15; // Advanced
            }
            console.log(`[Session] Auto-detected size for user ${userId} (${historyCount} sessions): ${numQuestions} questions`);
        }

        console.log(`[Session] Starting session for Topic="${topicName}", Difficulty="${difficulty}", Questions=${numQuestions}`);
        const generated = await aiGenerator.generateQuestions({
            category: topicName || 'General Aptitude',
            milestone: milestoneName || 'Milestone 1',
            n: numQuestions,
            difficulty: difficulty || 'medium'
        });

        console.log(`[Session] Questions successfully fetched/generated for ${topicName}`);

        const durationMap = {
            5: 8 * 60,
            10: 15 * 60,
            15: 23 * 60,
            20: 30 * 60
        };
        const durationSeconds = durationMap[numQuestions] || (numQuestions * 90); // Fallback 1.5 min per q

        const sessionId = `sess_${Date.now()}_${userId}`;
        sessions[sessionId] = {
            userId,
            topicId,
            questions: generated.questions,
            answers: [],
            currentIndex: 0,
            startTime: Date.now(),
            durationSeconds: durationSeconds // Store expected duration
        };

        res.json({
            sessionId,
            totalQuestions: generated.questions.length,
            currentQuestion: generated.questions[0],
            currentIndex: 0,
            durationSeconds
        });
    } catch (err) {
        console.error('Session start error:', err);
        res.status(500).json({ error: 'Failed to start session' });
    }
});

/**
 * Fetches a specific question from an active session by its index.
 * @route GET /api/session/question/:sessionId/:index
 */
router.get('/question/:sessionId/:index', authMiddleware, (req, res) => {
    const { sessionId, index } = req.params;
    const session = sessions[sessionId];

    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    const idx = parseInt(index);
    if (idx < 0 || idx >= session.questions.length) {
        return res.status(400).json({ error: 'Invalid question index' });
    }

    const question = session.questions[idx];
    res.json({
        question: question.question,
        options: question.options,
        currentIndex: idx,
        totalQuestions: session.questions.length,
        isLast: idx === session.questions.length - 1
    });
});

/**
 * Records a user's answer and provides immediate correctness feedback.
 * @route POST /api/session/answer
 */
router.post('/answer', authMiddleware, (req, res) => {
    const { sessionId, questionIndex, selectedOption } = req.body;
    const session = sessions[sessionId];

    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    // Record answer
    session.answers[questionIndex] = {
        selectedOption,
        timestamp: Date.now()
    };
    session.currentIndex = questionIndex + 1;

    // Check if immediate feedback mode
    const question = session.questions[questionIndex];
    const isCorrect = selectedOption === question.correctOptionIndex;

    res.json({
        message: 'Answer recorded',
        isCorrect,
        correctOptionIndex: question.correctOptionIndex,
        solution: question.solution,
        nextIndex: session.currentIndex,
        isComplete: session.currentIndex >= session.questions.length
    });
});

/**
 * Compiles and returns the final statistics for a completed session.
 * @route GET /api/session/result/:sessionId
 */
router.get('/result/:sessionId', authMiddleware, async (req, res) => {
    const { sessionId } = req.params;
    const session = sessions[sessionId];

    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    const total = session.questions.length;
    let correct = 0;
    const details = session.questions.map((q, idx) => {
        const ans = session.answers[idx];
        const isCorrect = ans && ans.selectedOption === q.correctOptionIndex;
        if (isCorrect) correct++;
        return {
            question: q.question,
            options: q.options,
            correctOptionIndex: q.correctOptionIndex,
            userAnswer: ans ? ans.selectedOption : null,
            isCorrect,
            solution: q.solution
        };
    });

    // Calculate accuracy percentage
    const accuracy = Math.round((correct / total) * 100);

    // XP calculation: Accuracy * baseXP * category specific weight
    const categoryWeight = 1.0; // TODO: Fetch weight from topic configuration
    const baseXP = 10;
    const xpEarned = Math.round(correct * baseXP * categoryWeight);

    // Save session to database
    try {
        // Check if session already exists to avoid duplicates on refresh
        const existingSession = await Session.findOne({ where: { id: sessionId } });

        if (!existingSession) {
            await Session.create({
                id: sessionId,
                userId: req.user.id,
                topicId: session.topicId,
                topicName: session.questions[0].topic || 'General', // Fallback
                milestoneName: session.questions[0].milestone || 'Unknown',
                totalQuestions: total,
                correctAnswers: correct,
                accuracy, // percentage
                xpEarned,
                difficulty: session.questions[0].difficulty || 'medium',
                durationSeconds: Math.round((Date.now() - session.startTime) / 1000)
            });
            console.log(`[Session] Persisted session ${sessionId} to DB.`);
        }
    } catch (dbErr) {
        console.error('[Session] Failed to persist session:', dbErr);
    }

    // Save session stats to user profile if not already saved for this session
    // Note: In a real DB we'd have a separate Sessions table and join. 
    // Here we just update aggregates on the User model.
    try {
        const user = await User.findByPk(req.user.id);
        if (user) {
            // Update Aggregate Stats
            user.totalXP += xpEarned;
            user.sessionsCompleted += 1;
            user.totalAccuracySum += accuracy;

            // --- Streak Logic ---
            const today = new Date();
            // Reset time part to ensure we strictly compare dates
            today.setHours(0, 0, 0, 0);

            let lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
            if (lastActive) {
                lastActive.setHours(0, 0, 0, 0);
            }

            if (!lastActive) {
                // First session ever
                user.streakCount = 1;
                user.lastActiveDate = new Date();
            } else {
                const diffTime = Math.abs(today - lastActive);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    // Consecutive day
                    user.streakCount += 1;
                    user.lastActiveDate = new Date();
                } else if (diffDays > 1) {
                    // Break in streak
                    user.streakCount = 1;
                    user.lastActiveDate = new Date();
                } else {
                    // Same day (diffDays === 0) - streak remains same, just update timestamp if needed
                    user.lastActiveDate = new Date();
                }
            }

            await user.save();
            console.log(`[Session] User stats updated. Streak: ${user.streakCount}, XP: ${user.totalXP}`);
        }
    } catch (e) { console.error(e); }

    // Progress is capped at 100%
    const progressPercent = Math.min(accuracy * categoryWeight, 100);

    // Generate AI Feedback
    let feedback = null;
    try {
        console.log(`[Session] Generating feedback for session ${sessionId}...`);
        feedback = await aiGenerator.generateFeedback({
            questions: session.questions,
            answers: session.answers,
            accuracy,
            total
        });
    } catch (err) {
        console.error('Error getting feedback:', err);
    }

    console.log(`[Session] Session completed: User=${req.user.id}, Accuracy=${accuracy}%, XP=${xpEarned}`);

    res.json({
        sessionId,
        total,
        correct,
        accuracy,
        xpEarned,
        progressPercent,
        details,
        feedback, // Add feedback to response
        duration: Math.round((Date.now() - session.startTime) / 1000)
    });
});

/**
 * Get user's assessment history.
 * @route GET /api/session/history
 */
router.get('/history', authMiddleware, async (req, res) => {
    try {
        const history = await Session.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']],
            limit: 50 // Limit to last 50 sessions
        });
        res.json({ history });
    } catch (err) {
        console.error('Failed to fetch history:', err);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

/**
 * Identify weak areas based on past performance.
 * @route GET /api/session/weak-areas
 */
router.get('/weak-areas', authMiddleware, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (user.sessionsCompleted < 10) {
            return res.json({
                eligible: false,
                message: `Complete ${10 - user.sessionsCompleted} more sessions to unlock Weak Area analysis.`
            });
        }

        // Find topics with average accuracy < 60%
        // We'll verify raw sessions for this logic
        const sessions = await Session.findAll({
            where: { userId: req.user.id }
        });

        const topicStats = {};
        sessions.forEach(s => {
            if (!topicStats[s.topicName]) {
                topicStats[s.topicName] = { total: 0, accuracySum: 0, count: 0 };
            }
            topicStats[s.topicName].count++;
            topicStats[s.topicName].accuracySum += s.accuracy;
        });

        const weakAreas = [];
        for (const [name, stats] of Object.entries(topicStats)) {
            const avg = stats.accuracySum / stats.count;
            if (avg < 60) {
                weakAreas.push({ name, accuracy: Math.round(avg), count: stats.count });
            }
        }

        res.json({
            eligible: true,
            weakAreas: weakAreas.sort((a, b) => a.accuracy - b.accuracy)
        });

    } catch (err) {
        console.error('Failed to fetch weak areas:', err);
        res.status(500).json({ error: 'Failed to analyze weak areas' });
    }
});

module.exports = router;
""",
    'public/assets/css/landing.css': """/* ===== Aptirise Landing Page CSS ===== */
:root {
    /* --- Light Theme Variables --- */
    --bg-primary: #f8fafc;
    --bg-secondary: #ffffff;
    --text-primary: #0f172a;
    --text-secondary: #475569;
    --text-muted: #94a3b8;
    --border-color: #e2e8f0;

    --primary: #0ea5e9;
    --primary-dark: #0284c7;
    --secondary: #6366f1;
    --secondary-dark: #4f46e5;

    --gradient-primary: linear-gradient(135deg, #0ea5e9, #38bdf8);
    --gradient-text: linear-gradient(135deg, #0ea5e9, #6366f1);

    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);

    --font-family: 'Inter', system-ui, -apple-system, sans-serif;
    --container-width: 1200px;
    --header-height: 70px;
    --radius-md: 12px;
    --radius-lg: 16px;
    --radius-full: 9999px;
}

body.dark {
    /* --- Dark Theme Variables --- */
    --bg-primary: #0f172a;
    --bg-secondary: #1e293b;
    --text-primary: #f1f5f9;
    --text-secondary: #94a3b8;
    --text-muted: #64748b;
    --border-color: #334155;

    --primary: #38bdf8;
    --primary-dark: #0ea5e9;
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
}

/* ===== Base Styles ===== */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

html {
    scroll-behavior: smooth;
}

body {
    font-family: var(--font-family);
    background-color: var(--bg-primary);
    color: var(--text-primary);
    line-height: 1.6;
    transition: background-color 0.3s ease, color 0.3s ease;
    overflow-x: hidden;
}

a {
    text-decoration: none;
    color: inherit;
    transition: color 0.2s;
}

ul {
    list-style: none;
}

img {
    max-width: 100%;
    display: block;
}

.container {
    max-width: var(--container-width);
    margin: 0 auto;
    padding: 0 24px;
}

.section {
    padding: 80px 0;
}

.text-gradient {
    background: var(--gradient-text);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.badge-tag {
    display: inline-block;
    padding: 4px 12px;
    border-radius: var(--radius-full);
    font-size: 0.85rem;
    font-weight: 600;
    background: rgba(14, 165, 233, 0.1);
    color: var(--primary);
    margin-bottom: 16px;
}

/* ===== Typography ===== */
h1,
h2,
h3,
h4,
h5 {
    color: var(--text-primary);
    font-weight: 700;
    line-height: 1.2;
}

h1 {
    font-size: 3.5rem;
    letter-spacing: -0.02em;
}

h2 {
    font-size: 2.5rem;
    letter-spacing: -0.01em;
    margin-bottom: 16px;
}

h3 {
    font-size: 1.5rem;
    margin-bottom: 12px;
}

p {
    color: var(--text-secondary);
    margin-bottom: 24px;
    font-size: 1.1rem;
}

@media (max-width: 768px) {
    h1 {
        font-size: 2.5rem;
    }

    h2 {
        font-size: 2rem;
    }
}

/* ===== Buttons ===== */
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 12px 24px;
    border-radius: var(--radius-md);
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
}

.btn-primary {
    background: var(--gradient-primary);
    color: white;
    box-shadow: 0 4px 14px rgba(14, 165, 233, 0.4);
}

.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(14, 165, 233, 0.6);
}

.btn-secondary {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
}

.btn-secondary:hover {
    border-color: var(--primary);
    color: var(--primary);
}

.btn-link {
    padding: 0;
    color: var(--primary);
    font-weight: 600;
}

.btn-link:hover {
    text-decoration: underline;
}

/* ===== Navbar ===== */
.navbar {
    position: sticky;
    top: 0;
    z-index: 1000;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border-color);
    height: var(--header-height);
}

body.dark .navbar {
    background: rgba(15, 23, 42, 0.8);
}

.nav-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 100%;
}

.logo {
    font-size: 1.5rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-primary);
}

.nav-links {
    display: flex;
    gap: 32px;
}

.nav-links a {
    font-weight: 500;
    color: var(--text-secondary);
    font-size: 0.95rem;
}

.nav-links a:hover {
    color: var(--primary);
}

.nav-actions {
    display: flex;
    align-items: center;
    gap: 16px;
}

.theme-toggle {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    font-size: 1.2rem;
}

.theme-toggle:hover {
    background: rgba(0, 0, 0, 0.05);
    color: var(--text-primary);
}

body.dark .theme-toggle:hover {
    background: rgba(255, 255, 255, 0.1);
}

/* ===== Hero Section ===== */
.hero {
    padding: 80px 0;
    display: flex;
    align-items: center;
    min-height: calc(100vh - var(--header-height));
    position: relative;
    overflow: hidden;
}

.hero-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 64px;
    align-items: center;
}

.hero-content h1 {
    margin-bottom: 24px;
}

.hero-subtitle {
    font-size: 1.25rem;
    margin-bottom: 32px;
    max-width: 500px;
}

.hero-btns {
    display: flex;
    gap: 16px;
    margin-bottom: 48px;
}

.feature-cards-mini {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
}

.mini-card {
    background: var(--bg-secondary);
    padding: 16px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    text-align: center;
    box-shadow: var(--shadow-sm);
}

.mini-card-icon {
    font-size: 1.5rem;
    margin-bottom: 8px;
    display: block;
}

.mini-card span {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
}

.hero-visual {
    position: relative;
}

.app-mockup {
    background: var(--bg-secondary);
    border-radius: var(--radius-lg);
    box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.2);
    border: 1px solid var(--border-color);
    overflow: hidden;
    transform: perspective(1000px) rotateY(-5deg) rotateX(2deg);
    transition: transform 0.5s ease;
}

.app-mockup:hover {
    transform: perspective(1000px) rotateY(0deg) rotateX(0deg);
}

.mockup-header {
    padding: 12px 20px;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    gap: 8px;
}

.dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #ddd;
}

.dot.red {
    background: #ff5f56;
}

.dot.yellow {
    background: #ffbd2e;
}

.dot.green {
    background: #27c93f;
}

.mockup-body {
    padding: 24px;
    background: var(--bg-primary);
    min-height: 300px;
}

/* ===== Problem / Solution ===== */
.problem-solution {
    background: var(--bg-secondary);
}

.bg-secondary {
    background: var(--bg-secondary);
}

.grid-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;
}

.card {
    background: var(--bg-primary);
    padding: 32px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    transition: transform 0.3s ease;
}

.problem-card:hover {
    transform: translateY(-5px);
}

.card-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: rgba(14, 165, 233, 0.1);
    color: var(--primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    margin-bottom: 24px;
}

/* ===== Milestones ===== */
.milestones-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 24px;
    margin-top: 48px;
}

.milestone-card {
    background: var(--bg-secondary);
    padding: 24px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    position: relative;
    overflow: hidden;
}

.milestone-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: var(--border-color);
}

.milestone-card:hover::before {
    background: var(--primary);
}

.milestone-badge {
    position: absolute;
    top: 24px;
    right: 24px;
    font-size: 0.8rem;
    padding: 4px 8px;
    background: var(--bg-primary);
    border-radius: 4px;
    color: var(--text-secondary);
}

/* ===== Social Proof ===== */
.social-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 48px;
    text-align: center;
    margin: 64px 0;
    padding: 48px;
    background: var(--bg-secondary);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
}

.stat-number {
    font-size: 3rem;
    font-weight: 800;
    color: var(--primary);
    margin-bottom: 8px;
}

.badge-ladder {
    display: flex;
    justify-content: center;
    gap: 16px;
    flex-wrap: wrap;
    margin-top: 48px;
}

.badge-step {
    padding: 8px 16px;
    border-radius: var(--radius-full);
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-secondary);
}

.badge-step.active {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
}

/* ===== Features ===== */
.feature-box {
    background: var(--bg-secondary);
    padding: 32px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
}

/* ===== Pricing ===== */
.pricing-card {
    max-width: 500px;
    margin: 0 auto;
    background: var(--bg-secondary);
    padding: 48px;
    border-radius: var(--radius-lg);
    border: 2px solid var(--primary);
    box-shadow: 0 20px 40px -10px rgba(14, 165, 233, 0.2);
    text-align: center;
}

.price {
    font-size: 4rem;
    font-weight: 800;
    color: var(--text-primary);
    margin: 24px 0;
}

.pricing-features {
    text-align: left;
    margin: 32px 0;
}

.pricing-features li {
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
}

.check-icon {
    color: var(--primary);
    font-weight: bold;
}

/* ===== Footer ===== */
footer {
    background: var(--bg-secondary);
    padding: 64px 0 32px;
    border-top: 1px solid var(--border-color);
}

.footer-grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr;
    gap: 48px;
    margin-bottom: 48px;
}

.footer-col h4 {
    margin-bottom: 24px;
}

.footer-col ul li {
    margin-bottom: 12px;
}

.footer-col a {
    color: var(--text-secondary);
}

.footer-col a:hover {
    color: var(--primary);
}

.footer-bottom {
    text-align: center;
    padding-top: 32px;
    border-top: 1px solid var(--border-color);
    color: var(--text-muted);
}

/* ===== Responsive ===== */
@media (max-width: 968px) {
    .hero-grid {
        grid-template-columns: 1fr;
        text-align: center;
    }

    .grid-3 {
        grid-template-columns: 1fr;
    }

    .hero-btns {
        justify-content: center;
    }

    .nav-links {
        display: none;
    }

    /* Simplified mobile nav for now */
    .footer-grid {
        grid-template-columns: 1fr 1fr;
    }
}

@media (max-width: 480px) {
    .feature-cards-mini {
        grid-template-columns: 1fr;
    }

    .social-stats {
        grid-template-columns: 1fr;
        gap: 24px;
    }

    .footer-grid {
        grid-template-columns: 1fr;
    }
}
""",
    'public/assets/js/landing.js': """/**
 * Aptirise Landing Page Logic
 * Handles theme toggling, auth checking, and scroll animations.
 */

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    checkAuth();
    initScrollAnimations();
});

/* ===== Theme Toggle ===== */
function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const icon = themeToggleBtn.querySelector('i');

    // Check saved theme
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.body.classList.add('dark');
        icon.classList.replace('fa-moon', 'fa-sun');
    }

    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        const isDark = document.body.classList.contains('dark');

        // Update Icon
        if (isDark) {
            icon.classList.replace('fa-moon', 'fa-sun');
            localStorage.setItem('theme', 'dark');
        } else {
            icon.classList.replace('fa-sun', 'fa-moon');
            localStorage.setItem('theme', 'light');
        }
    });
}

/* ===== Auth Check ===== */
function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        // User is logged in
        const dashboardBtn = document.getElementById('dashboard-link');
        if (dashboardBtn) {
            dashboardBtn.style.display = 'inline-flex';
        }
    }
}

/* ===== Scroll Animations ===== */
function initScrollAnimations() {
    // Add fade-in class to elements we want to animate
    const animatedElements = document.querySelectorAll('.card, .feature-box, .milestone-card, .hero-content, .hero-visual');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Animate once
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    animatedElements.forEach(el => {
        el.classList.add('fade-in-section');
        observer.observe(el);
    });
}

// Additional CSS for animations (injected dynamically or assume in CSS)
// Since I cannot edit CSS easily right now without another step, 
// I will inject the animation styles here for completeness if they aren't in CSS.
// But `landing.css` didn't have specific animation classes.
// I will add a style block to head.

const style = document.createElement('style');
style.textContent = `
    .fade-in-section {
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.6s ease-out, transform 0.6s ease-out;
    }
    
    .fade-in-section.visible {
        opacity: 1;
        transform: translateY(0);
    }
    
    /* Staggered delays if needed, but per-element observation handles basic stagger by scroll position */
`;
document.head.appendChild(style);
""",
    'public/index.html': """<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aptirise - Master Aptitude with AI</title>
    <meta name="description"
        content="AI-Powered Aptitude Practice with Streaks & Badges. Prepare for placements with fresh questions and gamified progress tracking.">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/landing.css">
    <!-- FontAwesome for Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>

<body>

    <!-- Navigation -->
    <nav class="navbar">
        <div class="container nav-container">
            <a href="#" class="logo">
                <span style="font-size: 1.5rem;">🧠</span> Aptirise
            </a>
            <div class="nav-links">
                <a href="#features">Features</a>
                <a href="#milestones">Milestones</a>
                <a href="#pricing">Pricing</a>
            </div>
            <div class="nav-actions">
                <button id="theme-toggle" class="theme-toggle" title="Toggle Theme">
                    <i class="fa-solid fa-moon"></i>
                </button>
                <a href="onboarding.html" class="btn btn-primary">Start Free</a>
                <!-- Hidden Dashboard Link for Logged In Users -->
                <a href="dashboard.html" id="dashboard-link" class="btn btn-secondary"
                    style="display: none;">Dashboard</a>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero">
        <div class="container hero-grid">
            <div class="hero-content">
                <div class="badge-tag">New: AI-Generated Questions 🚀</div>
                <h1>Master Aptitude with <span class="text-gradient">Aptirise</span></h1>
                <p class="hero-subtitle">
                    AI-powered questions + gamified streaks & badges.
                    Practice by Milestone. Track progress. Earn badges from Iron → Master.
                    Ready for placements?
                </p>
                <div class="hero-btns">
                    <a href="onboarding.html" class="btn btn-primary btn-lg">Start Free Practice</a>
                    <a href="#how-it-works" class="btn btn-secondary btn-lg">See How It Works</a>
                </div>
                <div class="feature-cards-mini">
                    <div class="mini-card">
                        <span class="mini-card-icon">🤖</span>
                        <br>
                        <span>AI Questions</span>
                    </div>
                    <div class="mini-card">
                        <span class="mini-card-icon">🔥</span>
                        <br>
                        <span>Daily Streaks</span>
                    </div>
                    <div class="mini-card">
                        <span class="mini-card-icon">🏆</span>
                        <br>
                        <span>Badges</span>
                    </div>
                </div>
            </div>
            <div class="hero-visual">
                <div class="app-mockup">
                    <div class="mockup-header">
                        <div class="dot red"></div>
                        <div class="dot yellow"></div>
                        <div class="dot green"></div>
                    </div>
                    <div class="mockup-body" style="display: flex; flex-direction: column; gap: 16px;">
                        <!-- Mockup Content Simulation -->
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="font-weight: 700;">Dashboard</div>
                            <div style="font-size: 1.2rem;">🔥 12</div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div style="background: rgba(14, 165, 233, 0.1); padding: 16px; border-radius: 8px;">
                                <div style="font-size: 0.8rem; color: #64748b;">Current Rank</div>
                                <div style="font-weight: 700; color: #0ea5e9;">Gold 🥇</div>
                            </div>
                            <div style="background: rgba(99, 102, 241, 0.1); padding: 16px; border-radius: 8px;">
                                <div style="font-size: 0.8rem; color: #64748b;">Accuracy</div>
                                <div style="font-weight: 700; color: #6366f1;">87% 🎯</div>
                            </div>
                        </div>
                        <div
                            style="background: var(--bg-primary); padding: 16px; border-radius: 8px; border: 1px solid var(--border-color);">
                            <div style="font-weight: 600; margin-bottom: 8px;">Recommended: Time & Work</div>
                            <div style="height: 6px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                                <div style="width: 60%; height: 100%; background: #0ea5e9;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Problem/Solution -->
    <section id="how-it-works" class="section problem-solution">
        <div class="container">
            <div class="text-center" style="max-width: 700px; margin: 0 auto 48px;">
                <h2>Why aptitude practice fails <span class="text-muted">(and how we fix it)</span></h2>
            </div>
            <div class="grid-3">
                <div class="card problem-card">
                    <div class="card-icon">🔄</div>
                    <h3>Fresh Questions</h3>
                    <p>Static question banks get boring. Our AI generates fresh questions every time you practice,
                        ensuring you never just memorize answers.</p>
                </div>
                <div class="card problem-card">
                    <div class="card-icon">🔥</div>
                    <h3>Daily Motivation</h3>
                    <p>Consistency is key. Build your streak, level up your XP, and see your progress visually every
                        single day.</p>
                </div>
                <div class="card problem-card">
                    <div class="card-icon">📊</div>
                    <h3>Structured Mastery</h3>
                    <p>Don't practice randomly. Focus on specific milestones mapped to real placement exam patterns.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Milestones -->
    <section id="milestones" class="section">
        <div class="container">
            <div class="text-center">
                <h2>Structured by Placement Milestones</h2>
                <p>Master specific topics in logical order to clear rounds.</p>
            </div>
            <div class="milestones-grid">
                <!-- 6 Manual Milestones as placeholder/example -->
                <div class="milestone-card">
                    <div class="milestone-badge">5+ Topics</div>
                    <h3>1. Foundations</h3>
                    <p>Number System, HCF/LCM, Averages, Simplification</p>
                    <a href="onboarding.html" class="btn-link">Start Practice →</a>
                </div>
                <div class="milestone-card">
                    <div class="milestone-badge">6 Topics</div>
                    <h3>2. Arithmetic I</h3>
                    <p>Ratio & Proportion, Ages, Partnerships, Mixtures</p>
                    <a href="onboarding.html" class="btn-link">Start Practice →</a>
                </div>
                <div class="milestone-card">
                    <div class="milestone-badge">5 Topics</div>
                    <h3>3. Arithmetic II</h3>
                    <p>Percentage, Profit & Loss, SI & CI</p>
                    <a href="onboarding.html" class="btn-link">Start Practice →</a>
                </div>
                <div class="milestone-card">
                    <div class="milestone-badge">4 Topics</div>
                    <h3>4. Speed Math</h3>
                    <p>Time & Work, Pipes & Cisterns, Time Speed Distance</p>
                    <a href="onboarding.html" class="btn-link">Start Practice →</a>
                </div>
                <div class="milestone-card">
                    <div class="milestone-badge">Advance</div>
                    <h3>5. Modern Math</h3>
                    <p>Permutation, Combination, Probability, Mensuration</p>
                    <a href="onboarding.html" class="btn-link">Start Practice →</a>
                </div>
                <div class="milestone-card">
                    <div class="milestone-badge">Logic</div>
                    <h3>6. Logical Reas.</h3>
                    <p>Series, Coding-Decoding, Blood Relations, Directions</p>
                    <a href="onboarding.html" class="btn-link">Start Practice →</a>
                </div>
            </div>
        </div>
    </section>

    <!-- Social Proof -->
    <section class="section problem-solution">
        <div class="container">
            <div class="text-center">
                <h2>Join Thousands Practicing Daily</h2>
            </div>
            <div class="social-stats">
                <div>
                    <div class="stat-number">10K+</div>
                    <div>Practice Sessions</div>
                </div>
                <div>
                    <div class="stat-number">50+</div>
                    <div>Aptitude Topics</div>
                </div>
                <div>
                    <div class="stat-number">500+</div>
                    <div>Daily Users</div>
                </div>
            </div>

            <div class="text-center">
                <h3>Climb the Ranks</h3>
                <div class="badge-ladder">
                    <div class="badge-step">Iron 🛡️</div>
                    <div class="badge-step">Bronze 🥉</div>
                    <div class="badge-step">Silver 🥈</div>
                    <div class="badge-step active">Gold 🥇</div>
                    <div class="badge-step">Elite 💎</div>
                    <div class="badge-step">Expert 🌟</div>
                    <div class="badge-step">Master 👑</div>
                </div>
            </div>
        </div>
    </section>

    <!-- Features -->
    <section id="features" class="section">
        <div class="container">
            <div class="text-center" style="margin-bottom: 48px;">
                <h2>Everything You Need to Ace Aptitude</h2>
            </div>
            <div class="grid-3">
                <div class="feature-box">
                    <i class="fa-solid fa-robot"
                        style="font-size: 2rem; color: var(--primary); margin-bottom: 16px;"></i>
                    <h4>AI-Generated Questions</h4>
                    <p class="text-muted">Algorithms that generate unique questions every time.</p>
                </div>
                <div class="feature-box">
                    <i class="fa-solid fa-bullseye"
                        style="font-size: 2rem; color: var(--primary); margin-bottom: 16px;"></i>
                    <h4>One-Question Focus</h4>
                    <p class="text-muted">Clean UI without distractions to improve speed.</p>
                </div>
                <div class="feature-box">
                    <i class="fa-solid fa-chart-pie"
                        style="font-size: 2rem; color: var(--primary); margin-bottom: 16px;"></i>
                    <h4>Detailed Analytics</h4>
                    <p class="text-muted">Know your weak areas and improve structurally.</p>
                </div>
                <div class="feature-box">
                    <i class="fa-solid fa-fire"
                        style="font-size: 2rem; color: var(--primary); margin-bottom: 16px;"></i>
                    <h4>Streak Tracking</h4>
                    <p class="text-muted">Don't break the chain. Build a daily habit.</p>
                </div>
                <div class="feature-box">
                    <i class="fa-solid fa-layer-group"
                        style="font-size: 2rem; color: var(--primary); margin-bottom: 16px;"></i>
                    <h4>Category Weights</h4>
                    <p class="text-muted">Smart weighting of topics based on exam trends.</p>
                </div>
                <div class="feature-box">
                    <i class="fa-solid fa-trophy"
                        style="font-size: 2rem; color: var(--primary); margin-bottom: 16px;"></i>
                    <h4>Ladder System</h4>
                    <p class="text-muted">Gamified progression from Iron to Master.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Pricing -->
    <section id="pricing" class="section problem-solution">
        <div class="container">
            <div class="text-center">
                <h2>Start Your Journey Free Today</h2>
                <p>No credit card required. Just pure practice.</p>
            </div>
            <div class="pricing-card">
                <h3>Free Forever</h3>
                <div class="price">₹0</div>
                <ul class="pricing-features">
                    <li><span class="check-icon">✓</span> Unlimited practice sessions</li>
                    <li><span class="check-icon">✓</span> All 6 Aptirise Milestones</li>
                    <li><span class="check-icon">✓</span> 30+ Aptitude Topics</li>
                    <li><span class="check-icon">✓</span> Full Badge Progression</li>
                    <li><span class="check-icon">✓</span> Detailed Analytics</li>
                </ul>
                <a href="onboarding.html" class="btn btn-primary btn-lg" style="width: 100%;">Create Free Account</a>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer>
        <div class="container">
            <div class="footer-grid">
                <div class="footer-col">
                    <h4>🧠 Aptirise</h4>
                    <p>AI-powered aptitude practice platform designed for students preparing for placements and
                        competitive exams.</p>
                </div>
                <div class="footer-col">
                    <h4>Platform</h4>
                    <ul>
                        <li><a href="#features">Features</a></li>
                        <li><a href="#milestones">Milestones</a></li>
                        <li><a href="#pricing">Pricing</a></li>
                        <li><a href="onboarding.html">Login</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h4>Legal</h4>
                    <ul>
                        <li><a href="#">Privacy Policy</a></li>
                        <li><a href="#">Terms of Service</a></li>
                        <li><a href="#">Cookie Policy</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h4>Connect</h4>
                    <ul>
                        <li><a href="#">Twitter</a></li>
                        <li><a href="#">LinkedIn</a></li>
                        <li><a href="#">Instagram</a></li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <p>Made By Vatsan for placement season. Copyright © 2026 Aptirise.</p>
            </div>
        </div>
    </footer>

    <script src="assets/js/landing.js"></script>
</body>

</html>
"""
}

def run_git(args):
    try:
        subprocess.run(['git'] + args, check=True, creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
        time.sleep(1) # wait for git lock release
    except subprocess.CalledProcessError as e:
        print(f"Error running git {' '.join(args)}: {e}")
        # Proceed anyway lightly

print("Starting Micro-Commit Process...")

# 1. Reset everything mixed to keep files on disk but unstaged
# Actually, I want to control the file content completely.
# To do "micro commits" of adding content, I should start with EMPTY files.
# But I already have full files on disk. 
# So:
# 1. Backup contents (done above in memory)
# 2. Add dashboard.html (it's renamed, so I should handle that)
# 3. Truncate other new files to empty.
# 4. Loop append and commit.

# Step 2: Handle Dashboard Rename
# Git status showed 'untracked: public/dashboard.html'. 
# I'll just add it as a new file.
run_git(['add', 'public/dashboard.html'])
run_git(['commit', '-m', 'refactor(dashboard): Move legacy dashboard to dashboard.html'])

# Step 3: Handle Session JS
# Since it was modified, I'll rewrite it line by line?
# It's better to rewrite it chunk by logical block.
session_js_content = files['routes/session.js']
chunks = session_js_content.split('\n\n') # Split by double newlines roughly paragraphs
# Wipe file
with open('routes/session.js', 'w', encoding='utf-8') as f:
    f.write('')

for i, chunk in enumerate(chunks):
    with open('routes/session.js', 'a', encoding='utf-8') as f:
        f.write(chunk + '\n\n')
    run_git(['add', 'routes/session.js'])
    run_git(['commit', '-m', f'feat(backend): Update session logic part {i+1}'])

# Step 4: Handle Landing CSS
css_content = files['public/assets/css/landing.css']
css_blocks = css_content.split('/* =====') 
# Skip empty first if any
with open('public/assets/css/landing.css', 'w', encoding='utf-8') as f:
    f.write('')

for i, block in enumerate(css_blocks):
    if not block.strip(): continue
    content = '/* =====' + block # Add back delimiter
    # If first block was before delimiter, handle that? 
    # Actually split removes delimiter.
    # The first block might be empty if file starts with delimiter.
    # If file starts with root vars, they might be in first block if no delimiter before them.
    # My file starts with delimiter.
    
    with open('public/assets/css/landing.css', 'a', encoding='utf-8') as f:
        f.write(content)
    
    # Extract section name for commit msg
    lines = block.strip().split('\n')
    section_name = lines[0].strip().replace('=', '').strip() if lines else f'Part {i}'
    
    run_git(['add', 'public/assets/css/landing.css'])
    run_git(['commit', '-m', f'style(landing): Add {section_name} styles'])

# Step 5: Handle Landing Index HTML
html_content = files['public/index.html']
# Split by sections
html_parts = html_content.split('<!-- ')
with open('public/index.html', 'w', encoding='utf-8') as f:
    f.write('')

for i, part in enumerate(html_parts):
    if not part.strip(): continue
    if i == 0: 
        content = part 
    else: 
        content = '<!-- ' + part
    
    with open('public/index.html', 'a', encoding='utf-8') as f:
        f.write(content)
        
    section_name = part.split('-->')[0].strip() if '-->' in part else f'Part {i}'
    run_git(['add', 'public/index.html'])
    run_git(['commit', '-m', f'feat(landing): Add {section_name} section'])

# Step 6: Handle Landing JS
js_content = files['public/assets/js/landing.js']
js_funcs = js_content.split('function ')
with open('public/assets/js/landing.js', 'w', encoding='utf-8') as f:
    f.write('')

for i, func in enumerate(js_funcs):
    if i == 0:
        content = func
    else:
        content = 'function ' + func
    
    with open('public/assets/js/landing.js', 'a', encoding='utf-8') as f:
        f.write(content)
    
    run_git(['add', 'public/assets/js/landing.js'])
    run_git(['commit', '-m', f'feat(landing-js): Add functionality part {i+1}'])

print("All commits generated. Pushing...")
run_git(['push', 'origin', 'master'])
print("Done!")
