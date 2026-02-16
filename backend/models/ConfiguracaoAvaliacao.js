// ConfiguracaoAvaliacao.js
module.exports = (sequelize, DataTypes) => {
  const ConfiguracaoAvaliacao = sequelize.define("ConfiguracaoAvaliacao", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nome: { type: DataTypes.STRING, allowNull: false }, // Ex: "Teste 1", "Trabalho"
    peso: { type: DataTypes.INTEGER, allowNull: false }, // Ex: 25 (para 25%)
    ordem: { type: DataTypes.INTEGER }, // Para saber se é a 1ª, 2ª avaliação
    disciplinaId: { type: DataTypes.UUID, allowNull: false }
  });
  return ConfiguracaoAvaliacao;
};