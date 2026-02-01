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

