/**
 * Authentication Middleware
 * 
 * Intercepts requests to protected routes and validates 
 * the JSON Web Token (JWT) provided in the Authorization header.
 * 
 * @author Aptitude AI Team
 * @version 1.0.0
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * JWT Authentication Middleware
 * Validates the Bearer token and attaches the decoded user to the request object.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn(`[Auth Middleware] Access denied: No token provided for ${req.originalUrl}`);
        return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        console.warn(`[Auth Middleware] Invalid or expired token attempt from IP: ${req.ip}`);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

module.exports = authMiddleware;
