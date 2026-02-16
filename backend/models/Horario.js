const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Horario extends Model {
    static associate(models) {
      // Associação com Professor
      Horario.belongsTo(models.Professor, {
        foreignKey: 'professorId',
        as: 'professor'
      });

      // Associação com Turma
      Horario.belongsTo(models.Turma, {
        foreignKey: 'turmaId',
        as: 'turma'
      });

      // Associação com Disciplina
      Horario.belongsTo(models.Disciplina, {
        foreignKey: 'disciplinaId',
        as: 'disciplina'
      });
    }
  }

  Horario.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    periodo: {
      type: DataTypes.ENUM('Manhã', 'Tarde', 'Noite'),
      allowNull: false
    },
    dia_semana: {
      type: DataTypes.ENUM('Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado' , 'Domingo'),
      allowNull: false
    },
    ordem_tempo: { type: DataTypes.INTEGER, allowNull: false },
    hora_inicio: { type: DataTypes.TIME, allowNull: false, defaultValue: '07:00:00' },
    duracao_minutos: { type: DataTypes.INTEGER, defaultValue: 50 },
    tipo_slot: {
      type: DataTypes.ENUM('Aula', 'Intervalo'),
      defaultValue: 'Aula'
    },
    // Nota: As chaves estrangeiras já estão nos campos abaixo, 
    // mas a associação acima é o que permite o "include" no controller.
    professorId: { type: DataTypes.UUID, allowNull: true },
    turmaId: { type: DataTypes.UUID, allowNull: false },
    disciplinaId: { type: DataTypes.UUID, allowNull: true }
  }, {
    sequelize,
    modelName: 'Horario',
    tableName: 'Horarios',
    indexes: [
      {
        unique: true,
        fields: ['turmaId', 'dia_semana', 'ordem_tempo', 'periodo']
      }
    ]
  });

  return Horario;
};