const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// 1. Importação dos modelos - ADICIONADO (sequelize, DataTypes) em cada um
const models = {
  Configuracao: require('./Configuracao')(sequelize, DataTypes),
  Curso: require('./Curso')(sequelize, DataTypes),
  Disciplina: require('./Disciplina')(sequelize, DataTypes), 
  Horario: require('./Horario')(sequelize, DataTypes),
  Turma: require('./Turma')(sequelize, DataTypes),
  Professor: require('./Professor')(sequelize, DataTypes),
  Aluno: require('./Aluno')(sequelize, DataTypes),
  Usuario: require('./Usuario')(sequelize, DataTypes),
  Nota: require('./Nota')(sequelize, DataTypes),
  Presenca: require('./Presenca')(sequelize, DataTypes),
  Aviso: require('./Aviso')(sequelize, DataTypes),
  Pagamento: require('./Pagamento')(sequelize, DataTypes), // <--- Agora vai funcionar!
  ConfiguracaoAvaliacao:  require('./ConfiguracaoAvaliacao')(sequelize , DataTypes),
  LogFaturamento: require('./LogFaturamento')(sequelize, DataTypes)
}; 

// 2. O LOOP QUE ATIVA AS RELAÇÕES
Object.keys(models).forEach((modelName) => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

models.sequelize = sequelize;
models.Sequelize = Sequelize;

module.exports = models;