const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class Disciplina extends Model {
    // Define que a Disciplina tem muitos Horarios
    static associate(models) {
      Disciplina.hasMany(models.Horario, {
        foreignKey: "disciplinaId",
        as: "horarios",
      });
    }
  }

  Disciplina.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },

      
      nome: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      carga_horaria: {
        type: DataTypes.INTEGER,
      },
      tipo: {
        type: DataTypes.ENUM("Técnica", "Geral"),
        defaultValue: "Geral",
      },
      vocacional: {
        type: DataTypes.ENUM("3" , "4" , "5"),
        defaultValue: "3",
        allowNull: false,
      },
      // Chaves estrangeiras (Devem ser UUID para bater com as outras tabelas)
      configuracaoId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      aulas_planejadas: {
        type: DataTypes.INTEGER,
        defaultValue: 30, // Um valor padrão razoável
        allowNull: false,
      },
      cursoId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Disciplina",
      tableName: "Disciplinas",
    },
  );

  return Disciplina;
};
