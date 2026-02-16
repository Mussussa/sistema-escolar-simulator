const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Configuracao extends Model {
    // ADICIONE ESTE BLOCO ABAIXO:
    static associate(models) {
      // Define que a Configuração tem muitos Cursos
      Configuracao.hasMany(models.Curso, { 
        foreignKey: 'configuracaoId', 
        as: 'cursos' 
      });

      // Define que a Configuração tem muitas Turmas
      Configuracao.hasMany(models.Turma, { 
        foreignKey: 'configuracaoId', 
        as: 'turmas' 
      });
    }
  }

  Configuracao.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    nome_instituicao: { type: DataTypes.STRING, allowNull: false },
    tipo_ensino: { 
      type: DataTypes.ENUM('Creche', 'Primário', 'Secundário', 'Técnico', 'Universitário'),
      allowNull: false 
    },
    // Regras de Avaliação
    quantidade_avaliacoes_trimestre: { type: DataTypes.INTEGER, defaultValue: 3 },
    tem_exame_final: { type: DataTypes.BOOLEAN, defaultValue: false },
    media_aprovacao: { type: DataTypes.DECIMAL(4,2), defaultValue: 10 },
    
    // Regras de Desistência e Assiduidade
    limite_faltas_trimestre: { type: DataTypes.INTEGER, defaultValue: 15 },
    dias_inatividade_desistente: { 
      type: DataTypes.INTEGER, 
      defaultValue: 30
    },
    
    // Administrativo
    moeda: { type: DataTypes.STRING, defaultValue: 'MT' },
    ano_lectivo_actual: { type: DataTypes.INTEGER, defaultValue: new Date().getFullYear() },
  }, {
    sequelize,
    modelName: 'Configuracao',
    tableName: 'Configuracaos'
  });

  return Configuracao;
};