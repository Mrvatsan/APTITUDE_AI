/**
 * Milestone Data Model
 * 
 * Defines the schema for educational milestones, which serve 
 * as high-level progress markers for the aptitude platform.
 * 
 * @author Aptitude AI Team
 * @version 1.0.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Milestone = sequelize.define('Milestone', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        }
    }, {
        timestamps: true,
        tableName: 'milestones'
    });

    return Milestone;
};
