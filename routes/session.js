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

// In-memory store for sessions (placeholder - will use DB in production)
const sessions = {};

// Start a new session (protected route)
router.post('/start', authMiddleware, async (req, res) => {
    const { topicId, topicName, milestoneName, numQuestions, difficulty } = req.body;
    const userId = req.user.id;

    try {
        console.log(`[Session] Starting session for Topic="${topicName}", Difficulty="${difficulty}", Questions=${numQuestions}`);
        const generated = await aiGenerator.generateQuestions({
            category: topicName || 'General Aptitude',
            milestone: milestoneName || 'Milestone 1',
            n: numQuestions || 5,
            difficulty: difficulty || 'medium'
        });

        console.log(`[Session] Questions successfully fetched/generated for ${topicName}`);

        const sessionId = `sess_${Date.now()}_${userId}`;
        sessions[sessionId] = {
            userId,
            topicId,
            questions: generated.questions,
            answers: [],
            currentIndex: 0,
            startTime: Date.now()
        };

        res.json({
            sessionId,
            totalQuestions: generated.questions.length,
            currentQuestion: generated.questions[0],
            currentIndex: 0
        });
    } catch (err) {
        console.error('Session start error:', err);
        res.status(500).json({ error: 'Failed to start session' });
    }
});

// Get next question in session
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

// Submit an answer for a question (protected route)
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

// Get session result and stats (protected route)
router.get('/result/:sessionId', authMiddleware, (req, res) => {
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

    // Progress is capped at 100%
    const progressPercent = Math.min(accuracy * categoryWeight, 100);

    console.log(`[Session] Session completed: User=${req.user.id}, Accuracy=${accuracy}%, XP=${xpEarned}`);

    res.json({
        sessionId,
        total,
        correct,
        accuracy,
        xpEarned,
        progressPercent,
        details,
        duration: Math.round((Date.now() - session.startTime) / 1000)
    });
});

module.exports = router;
