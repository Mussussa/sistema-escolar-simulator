module.exports = (sequelize, DataTypes) => {
  const Pagamento = sequelize.define("Pagamento", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    mes: { type: DataTypes.STRING, allowNull: false },
    ano: { type: DataTypes.INTEGER, allowNull: false },
    valor_original: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    valor_atual: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    valor_pago: { type: DataTypes.DECIMAL(10, 2) },
    data_vencimento: { type: DataTypes.DATE, allowNull: false },
    data_confirmacao: { type: DataTypes.DATE },
    status: {
      type: DataTypes.ENUM("pendente", "pago", "atrasado"),
      defaultValue: "pendente",
    },
    nivel_multa: { type: DataTypes.INTEGER, defaultValue: 0 }, // 0: 0%, 1: 10%, 2: 25%
    tipo_mes: {
      type: DataTypes.ENUM("lectivo", "ferias"),
      defaultValue: "lectivo",
    },
    talao_url: { type: DataTypes.STRING },
    entidade: { type: DataTypes.STRING, defaultValue: "45678" },
    referencia: { type: DataTypes.STRING, unique: true },
  });
  Pagamento.associate = (models) => {
    Pagamento.belongsTo(models.Aluno, { foreignKey: "alunoId", as: "aluno" });
  };
  return Pagamento;
};
