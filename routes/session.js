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

