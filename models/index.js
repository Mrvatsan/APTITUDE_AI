/**
 * Data Models Index
 * 
 * Initializes the Sequelize instance, defines database connections, 
 * and aggregates all application models for centralized access.
 * 
 * @author Aptitude AI Team
 * @version 1.0.0
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DB_PATH || './aptitude.sqlite',
    logging: false,
});

const User = require('./user')(sequelize);
const Milestone = require('./milestone')(sequelize);
const Session = require('./session')(sequelize);

// Define Associations
User.hasMany(Session, { foreignKey: 'userId', as: 'sessions' });
Session.belongsTo(User, { foreignKey: 'userId', as: 'user' });

/**
 * Central Sequelize instance for database operations.
 */
module.exports = {
    sequelize,
    User,
    Milestone,
    Session
};
