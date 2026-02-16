const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class Presenca extends Model {
    static associate(models) {
      Presenca.belongsTo(models.Aluno, { foreignKey: "alunoId", as: "aluno" });
      Presenca.belongsTo(models.Disciplina, {
        foreignKey: "disciplinaId",
        as: "disciplina",
      });
    }
  }
  Presenca.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      data: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
      status: { type: DataTypes.ENUM("P", "F" , "FJ"), defaultValue: "P" }, // P = Presente, F = Falta
      justificativa: {
        type: DataTypes.TEXT,
        allowNull: true, // Só será preenchido se o status for FJ
      },
      alunoId: { type: DataTypes.UUID, allowNull: false },
      disciplinaId: { type: DataTypes.UUID, allowNull: false },
    },
    { 
      sequelize, 
      modelName: "Presenca",
      // ADICIONE ESTE BLOCO ABAIXO:
      indexes: [
        {
          unique: true,
          fields: ["data", "alunoId", "disciplinaId"]
        }
      ]
    },
  );
  return Presenca;
};
