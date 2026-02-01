/**
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

