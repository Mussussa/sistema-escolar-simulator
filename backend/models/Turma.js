const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Turma extends Model {
    static associate(models) {
      Turma.belongsTo(models.Curso, { foreignKey: 'cursoId', as: 'curso' });
      Turma.belongsTo(models.Professor, { foreignKey: 'professorId', as: 'regente' });
      Turma.belongsTo(models.Configuracao, { foreignKey: 'configuracaoId', as: 'configuracao' });
      Turma.hasMany(models.Horario, { foreignKey: 'turmaId', as: 'horarios' });
      Turma.hasMany(models.Aluno, { foreignKey: 'turmaId', as: 'alunos' });
    }
  }

  Turma.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    nome: { type: DataTypes.STRING, allowNull: false },
    turno: {
      type: DataTypes.ENUM('Manhã', 'Tarde', 'Noite'),
      allowNull: true,
      defaultValue: 'Manhã'
    },
    ano_lectivo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: new Date().getFullYear()
    },
    vagas:{ type: DataTypes.INTEGER, allowNull: true, defaultValue: 30 },
    cursoId: { type: DataTypes.UUID, allowNull: true },
    professorId: { type: DataTypes.UUID, allowNull: true },
    configuracaoId: { type: DataTypes.UUID, allowNull: true },
    vagas_ocupadas: { type: DataTypes.INTEGER, defaultValue: 0 },
  }, {
    sequelize,
    modelName: 'Turma',
    tableName: 'Turmas'
  });

  return Turma;
};