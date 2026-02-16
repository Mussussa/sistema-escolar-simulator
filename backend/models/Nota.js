const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class Nota extends Model {
    static associate(models) {
      Nota.belongsTo(models.Aluno, { foreignKey: "alunoId", as: "aluno" });
      Nota.belongsTo(models.Disciplina, {
        foreignKey: "disciplinaId",
        as: "disciplina",
      });
      Nota.belongsTo(models.ConfiguracaoAvaliacao, {
        foreignKey: "configuracaoId",
        as: "ConfiguracaoAvaliacao",
        onDelete: 'CASCADE'
      });
    }
  }

  Nota.init(
    {
      // Alterado para 5,2 para aceitar 100.00 sem erro de overflow
      valor: { type: DataTypes.DECIMAL(5, 2) },
      alunoId: { type: DataTypes.UUID, allowNull: false },
      configuracaoId: { type: DataTypes.UUID, allowNull: false },
      disciplinaId: { type: DataTypes.UUID, allowNull: false },
      observacao: { 
      type: DataTypes.STRING, 
      allowNull: true // Pode ser vazio para notas normais
    }
    },
    
    { 
      sequelize, 
      modelName: "Nota",
      tableName: "Nota", // Força o nome da tabela
      indexes: [
        {
          unique: true,
          fields: ['alunoId', 'disciplinaId', 'configuracaoId'],
          name: 'nota_unica_aluno_disciplina_config' // Nome para o índice no banco
        }
      ]
    }
  );

  return Nota;
};