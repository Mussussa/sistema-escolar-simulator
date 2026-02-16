module.exports = (sequelize, DataTypes) => {
  const LogFaturamento = sequelize.define('LogFaturamento', {
    id: { 
      type: DataTypes.UUID, 
      defaultValue: DataTypes.UUIDV4, 
      primaryKey: true 
    },
    mes_referencia: DataTypes.STRING,
    ano_referencia: DataTypes.INTEGER,
    total_faturas: DataTypes.INTEGER,
    status: DataTypes.STRING,
    executado_em: { 
      type: DataTypes.DATE, 
      defaultValue: DataTypes.NOW 
    }
  }, {
    tableName: 'LogFaturamentos' // Força o nome da tabela
  });

  return LogFaturamento;
};