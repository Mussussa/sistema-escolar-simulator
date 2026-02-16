const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class Professor extends Model {
    static associate(models) {
      Professor.hasMany(models.Turma, {
        foreignKey: "professorId",
        as: "turmasRegentes",
      });
      Professor.hasMany(models.Horario, {
        foreignKey: "professorId",
        as: "horarios",
      });
      this.hasOne(models.Usuario, { foreignKey: 'professorId', as: 'usuario' });
    }
  }

  Professor.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      nome: { type: DataTypes.STRING, allowNull: false },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      telefone: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          // Regex para Moçambique:
          // ^(82|83|84|85|86|87) -> Deve começar com um desses prefixos
          // [0-9]{7} -> Seguido de exatamente 7 dígitos numéricos
          is: {
            args: /^(82|83|84|85|86|87)[0-9]{7}$/,
            msg: "O número de telefone deve ser válido em Moçambique (ex: 841234567)",
          },
        },
      },
      bi: { type: DataTypes.STRING, unique: true },
      especialidade: { type: DataTypes.STRING },
      nivel_academico: { type: DataTypes.STRING },
      data_contratacao: {
        type: DataTypes.DATEONLY,
        defaultValue: DataTypes.NOW,
      },
      estado: {
        type: DataTypes.ENUM("Ativo", "Inativo", "Férias"),
        defaultValue: "Ativo",
      },
    },
    {
      sequelize,
      modelName: "Professor",
      tableName: "Professors",
    }
  );

  return Professor;
};
