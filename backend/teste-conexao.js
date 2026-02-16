// backend/teste-conexao.js
require('dotenv').config();
const { Sequelize } = require('sequelize');

console.log("Tentando conectar ao Supabase...");

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  // REMOVA as dialectOptions que tinham o SSL
  logging: false 
});

async function testar() {
  try {
    await sequelize.authenticate();
    console.log('✅ SUCESSO: O Node.js ligou-se ao MussussaStorage!');
    process.exit(0); // Fecha o teste com sucesso
  } catch (error) {
    console.error('❌ ERRO DE CONEXÃO:');
    console.error(error.message);
    process.exit(1); // Fecha com erro
  }
}

testar();