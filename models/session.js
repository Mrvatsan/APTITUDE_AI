/**
 * Session Data Model
 * 
 * Stores the history of practice sessions, including scores and
 * accuracy, to enable weak area analysis and history review.
 * 
 * @author Aptitude AI Team
 * @version 1.0.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Session = sequelize.define('Session', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        topicId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        topicName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        milestoneName: {
            type: DataTypes.STRING,
            allowNull: true
        },
        totalQuestions: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        correctAnswers: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        accuracy: {
            type: DataTypes.INTEGER, // Percentage (0-100)
            allowNull: false
        },
        xpEarned: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        difficulty: {
            type: DataTypes.STRING,
            defaultValue: 'medium'
        },
        durationSeconds: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        completedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        timestamps: true,
        tableName: 'sessions'
    });

    return Session;
};
