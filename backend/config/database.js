const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false // Essencial para aceitar o certificado do Supabase
    }
  },
  pool: {
    max: 5,        // Ajustado para o plano Nano (limita conexões simultâneas)
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

module.exports = sequelize;