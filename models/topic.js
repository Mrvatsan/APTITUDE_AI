const { DataTypes } = require('sequelize');
const sequelize = require('./index');
const Milestone = require('./milestone');

const Topic = sequelize.define('Topic', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    milestoneId: {
        type: DataTypes.INTEGER,
        references: {
            model: Milestone,
            key: 'id'
        },
        onDelete: 'CASCADE'
    }
}, {
    timestamps: true,
    tableName: 'topics'
});

module.exports = Topic;
