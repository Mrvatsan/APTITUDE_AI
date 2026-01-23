const sequelize = require('./models');

(async () => {
    try {
        await sequelize.sync();
        console.log('Database synchronized successfully');
        process.exit(0);
    } catch (err) {
        console.error('Error syncing database:', err);
        process.exit(1);
    }
})();
