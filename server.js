/**
 * Aptitude Master - Server Entry Point
 * 
 * Main Express server configuration, middleware integration, 
 * and API route registration.
 * 
 * @author Aptitude AI Team
 * @version 1.1.0
 */

const cors = require('cors');
const dotenv = require('dotenv');
const express = require('express');
const path = require('path');

dotenv.config();

const app = express();
// Server port configuration (default: 3000)
const port = process.env.PORT || 3000;

// Middleware
console.log('📦 Registering middleware...');
app.use(cors());
app.use(express.json());

// Serve static files from public directory
console.log('📂 Serving static files from "public"...');
app.use(express.static(path.join(__dirname, 'public')));

// Import route modules
const authRoutes = require('./routes/auth');
const milestoneRoutes = require('./routes/milestones');
const sessionRoutes = require('./routes/session');

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/session', sessionRoutes);

/**
 * Health check endpoint to verify server status.
 * @route GET /api/health
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '0.2.0', message: 'Aptitude Master API is running' });
});

/**
 * Catch-all route to serve the SPA index.html for client-side routing.
 * @route GET *
 */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Database synchronization
const sequelize = require('./models/index');

// Sync database and start server
sequelize.sync({ alter: true }).then(() => {
  app.listen(port, () => {
    console.log('--------------------------------------------');
    console.log('🚀 Starting Aptitude Master Server...');
    console.log('--------------------------------------------');
    console.log(`\n🧠 Aptitude Master is running!`);
    console.log(`   Local:   http://localhost:${port}`);
    console.log(`   API:     http://localhost:${port}/api`);
    console.log(`\n📚 Happy learning!\n`);
  });
}).catch(err => {
  console.error('Unable to connect to the database:', err);
});

// Server configuration confirmed

// Database connection established

// Middleware setup complete

// Server configuration confirmed

// Database connection established

// Middleware setup complete

// Static file serving configuration
