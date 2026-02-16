const { Model, DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");

module.exports = (sequelize) => {
  class Usuario extends Model {
    static associate(models) {
  // 1. RELAÇÃO CORRETA: O Usuário "tem um" Aluno. 
  // O Sequelize vai procurar na tabela Aluno quem tem o "usuarioId" deste usuário.
  Usuario.hasOne(models.Aluno, { 
    foreignKey: "usuarioId", 
    as: "aluno" 
  });

  // 2. Relacionamento com Professor
  Usuario.belongsTo(models.Professor, {
    foreignKey: "professorId",
    as: "professor",
  });

  // 3. Outras associações
  Usuario.hasMany(models.Configuracao, {
    foreignKey: "usuarioId",
    as: "configuracoes",
  });

  Usuario.hasMany(models.Nota, { foreignKey: "usuarioId", as: "notas" });
  
  Usuario.hasMany(models.Presenca, {
    foreignKey: "usuarioId",
    as: "presencas",
  });

  Usuario.hasMany(models.Horario, {
    foreignKey: "usuarioId",
    as: "horarios",
  });
}
  }

  Usuario.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      username: { type: DataTypes.STRING, unique: true, allowNull: false },
      senha: { type: DataTypes.STRING, allowNull: false },
      // Níveis: 'admin' (Diretor) ou 'professor'
      role: {
        type: DataTypes.ENUM(
          "admin",
          "professor",
          "configuracoes",
          "aluno",
          "pendente",
          "matricula",
          "propina"
        ),
        allowNull: false,
        defaultValue: "pendente",
      },
      professorId: { type: DataTypes.UUID, allowNull: true },
      // No seu model Usuario.init
      deve_alterar_senha: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      alunoId: { type: DataTypes.UUID, allowNull: true },
email: { 
  type: DataTypes.STRING,
  allowNull: false,
  unique: true, // <--- ADICIONAR ISTO
  validate: {
    isEmail: true // Garante que é um formato de e-mail válido
  }
},
      reset_token: {
        type: DataTypes.STRING,
        allowNull: true
      },
      reset_expires: {
        type: DataTypes.DATE,
        allowNull: true
      },
    },
    
    {
      sequelize,
      modelName: "Usuario",
      hooks: {
        // Criptografa a senha automaticamente antes de salvar no banco
        beforeCreate: async (user) => {
          const salt = await bcrypt.genSalt(10);
          user.senha = await bcrypt.hash(user.senha, salt);
        },
      },
    }
  );

  return Usuario;
};
