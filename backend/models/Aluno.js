const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class Aluno extends Model {
    static associate(models) {
      Aluno.belongsTo(models.Turma, { foreignKey: "turmaId", as: "turma" });
      Aluno.hasMany(models.Nota, { foreignKey: "alunoId", as: "notas" });
      Aluno.hasMany(models.Presenca, {
        foreignKey: "alunoId",
        as: "presencas",
      });
      // Vinculamos ao usuário para o login
      Aluno.belongsTo(models.Usuario, {
        foreignKey: "usuarioId",
        as: "usuario",
      });
      Aluno.hasMany(models.Pagamento, {
        foreignKey: "alunoId",
        as: "pagamentos",
      });
      Aluno.belongsTo(models.Curso, { foreignKey: "cursoId", as: "curso" });
    }
  }

  Aluno.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      nome: { type: DataTypes.STRING, allowNull: false },

      // --- DADOS ACADÊMICOS ---
      escola_anterior: { type: DataTypes.STRING },
      ultima_classe: { type: DataTypes.STRING },
      documento_url: { type: DataTypes.STRING }, // Caminho do PDF/Foto enviado
      cursoId: { type: DataTypes.UUID, allowNull: true },

      // --- CONTATO E EMERGÊNCIA ---
      telefone_emergencia: { type: DataTypes.STRING },
      contato_nome: { type: DataTypes.STRING },
      tipo_sanguineo: { type: DataTypes.STRING },
      alergias: { type: DataTypes.TEXT },

      // --- CONTROLE DE MATRÍCULA ---
      status: {
        type: DataTypes.ENUM(
          "pendente",
          "doc_aprovado",
          "rejeitado",
          // "matriculado",
          // "concluido",
        ),
        defaultValue: "pendente",
      },
      progresso: { type: DataTypes.INTEGER, defaultValue: 75 }, // Começa em 75% ao enviar
      pago: { type: DataTypes.BOOLEAN, defaultValue: false },

      // --- RELAÇÕES ---
      numero_chamada: { type: DataTypes.INTEGER },
      turmaId: { type: DataTypes.UUID, allowNull: true }, // Nulo até a secretaria atribuir
      usuarioId: { type: DataTypes.UUID, allowNull: false },
      notaExame: { type: DataTypes.FLOAT, allowNull: true },
      notaRecorrencia: { type: DataTypes.FLOAT, allowNull: true },
      motivo_rejeicao: {
      type: DataTypes.TEXT, // Usamos TEXT para caber uma mensagem longa
      allowNull: true
    },
    contacto: {
      type: DataTypes.INTEGER
    },
    // No seu model Aluno
isAntigo: {
  type: DataTypes.BOOLEAN,
  defaultValue: false
},
saldoDevedorInicial: {
  type: DataTypes.DECIMAL(10, 2),
  defaultValue: 0.00
}
    },
    
    { sequelize, modelName: "Aluno" },
  );

  return Aluno;
};
