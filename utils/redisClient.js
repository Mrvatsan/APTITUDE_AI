/**
 * Redis Client Utility
 * 
 * Manages connection to Redis for temporary OTP storage.
 * Handles connection errors gracefully.
 */

const { createClient } = require('redis');
require('dotenv').config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const client = createClient({
    url: redisUrl
});

client.on('error', (err) => console.error('[Redis] Client Error', err));
client.on('connect', () => console.log('[Redis] Connected to server'));

// Connect immediately
(async () => {
    try {
        await client.connect();
    } catch (err) {
        console.error('[Redis] Failed to connect:', err);
    }
})();

module.exports = client;
