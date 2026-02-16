const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Curso extends Model {
    // No arquivo models/Curso.js
static associate(models) {
  // O Curso tem muitas Turmas
  Curso.hasMany(models.Turma, { foreignKey: 'cursoId', as: 'turmas' });
  Curso.belongsTo(models.Configuracao, { foreignKey: 'configuracaoId', as: 'configuracao' });
  Curso.hasMany(models.Aluno, { foreignKey: 'cursoId', as: 'alunos' });
}
  }

  Curso.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    nome: { type: DataTypes.STRING, allowNull: false },
    duracao_anos: { type: DataTypes.INTEGER, defaultValue: 3 },
    codigo: { type: DataTypes.STRING, unique: true },
    regime: { 
    type: DataTypes.ENUM('Normal', 'Semi-presencial'), 
    defaultValue: 'Normal',
    allowNull: false 
  },
    configuracaoId: { 
      type: DataTypes.UUID, 
      allowNull: true 
    }
  }, {
    sequelize,
    modelName: 'Curso',
    tableName: 'Cursos'
  });

  return Curso;
};