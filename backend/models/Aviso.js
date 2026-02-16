const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class Aviso extends Model {
    static associate(models) {
      Aviso.belongsTo(models.Turma, { foreignKey: 'turmaId', as: 'turma' });
      Aviso.belongsTo(models.Curso, { foreignKey: 'cursoId', as: 'curso' });
    }
  }

  Aviso.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    titulo: { type: DataTypes.STRING, allowNull: false },
    conteudo: { type: DataTypes.TEXT, allowNull: false },
    tipo: { 
      type: DataTypes.ENUM('Geral', 'Urgente', 'Evento'), 
      defaultValue: 'Geral' 
    },
    // Se forem nulos, o aviso é para todos. Se preenchidos, são segmentados.
    cursoId: { type: DataTypes.UUID, allowNull: true },
    turmaId: { type: DataTypes.UUID, allowNull: true },
    data_expiracao: { type: DataTypes.DATE, allowNull: true }
  }, { 
    sequelize, 
    modelName: "Aviso",
    tableName: "Avisos" 
  });

  return Aviso;
};