/**
 * User Data Model
 * 
 * Defines the schema for application users, including authentication 
 * credentials, game progress (XP), and usage preferences.
 * 
 * @author Aptitude AI Team
 * @version 1.0.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const User = sequelize.define('User', {
        // Unique identifier for each user
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        // Display name and login identifier
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        // Contact email with validation
        email: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: { isEmail: true }
        },
        // Securely hashed password credential
        passwordHash: {
            type: DataTypes.STRING,
            allowNull: false
        },
        // Total accumulated experience points for gamification
        totalXP: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        // Number of practice sessions completed
        sessionsCompleted: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        // Sum of accuracy percentages from all sessions (for average calculation)
        totalAccuracySum: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        // Current consecutive days the user has been active
        streakCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        // Timestamp of the most recent user activity
        lastActiveDate: {
            type: DataTypes.DATE,
            allowNull: true
        },
        // User-specific settings and goal data (stored as JSON)
        preferences: {
            type: DataTypes.JSON,
            allowNull: true
        }
    }, {
        timestamps: true,
        tableName: 'users'
    });

    return User;
};

// User schema definition

// Password hashing requirement
