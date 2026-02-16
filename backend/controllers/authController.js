const { Usuario, Professor, Aluno } = require("../models");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Resend } = require('resend');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Joi = require("joi");
const { Op } = require("sequelize");


// 1. APENAS ESTA CONFIGURAÇÃO DE ENVIO (RESEND)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Ex: hinstec.suporte@gmail.com
    pass: process.env.EMAIL_PASS  // Sua "Senha de App" do Google
  }
});

// --- LOGIN ---


exports.login = async (req, res) => {
  try {
    // 1. Definição do Schema de Validação
    const schema = Joi.object({
      username: Joi.string().trim().required().messages({
        "string.empty": "O nome de usuário não pode estar vazio.",
        "any.required": "O nome de usuário é obrigatório."
      }),
      senha: Joi.string().required().messages({
        "string.empty": "A senha não pode estar vazia.",
        "any.required": "A senha é obrigatória."
      })
    });

    // 2. Validar o req.body
    const { error, value } = schema.validate(req.body);

    // Se houver erro na validação, retorna logo 400
    if (error) {
      return res.status(400).json({ erro: error.details[0].message });
    }

    // Usamos os dados limpos e validados pelo Joi (value)
    const { username, senha } = value;

    // 3. Buscar o usuário no banco
    const usuario = await Usuario.findOne({
      where: { username },
      include: [
        { model: Professor, as: "professor", attributes: ["nome", "id"] },
        { model: Aluno, as: "aluno", attributes: ["nome", "id"] },
      ],
    });

    // Se usuário não existe
    if (!usuario) {
      return res.status(401).json({ erro: "Credenciais inválidas" });
    }

    // 4. Verificar a senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ erro: "Credenciais inválidas" });
    }

    // 5. Definir nome de exibição
    let nomeExibicao = "Usuário do Sistema";
    if (usuario.role === "admin" || usuario.role === "configuracoes") {
      nomeExibicao = "Diretor Geral";
    }
    if (usuario.professor) nomeExibicao = usuario.professor.nome;
    if (usuario.aluno) nomeExibicao = usuario.aluno.nome;

    // 6. Gerar Token JWT
    const token = jwt.sign(
      {
        id: usuario.id,
        role: usuario.role,
        professorId: usuario.professorId,
        alunoId: usuario.alunoId,
        nome: nomeExibicao,
      },
      process.env.JWT_SECRET || "CHAVE_MESTRA_ESCOLAR_2024",
      { expiresIn: "8h" }
    );

    // Define se estamos em produção (Render) ou desenvolvimento (Localhost)
    const isProduction = process.env.NODE_ENV === 'production';

    // Grava o Token no Cookie (O navegador guarda, o JS não vê)
    res.cookie('token', token, {
      httpOnly: true, // Segurança contra XSS
      secure: isProduction, // HTTPS em produção
      sameSite: isProduction ? 'None' : 'Lax', // Necessário para Cross-Domain (Vercel -> Render)
      maxAge: 8 * 60 * 60 * 1000 // 8 horas
    });

    // 7. Retornar resposta
res.json({
      mensagem: "Login realizado com sucesso!", 
      // O token foi removido daqui
      usuario: {
        id: usuario.id,
        username: usuario.username,
        role: usuario.role,
        nome: nomeExibicao,
        contextoId: usuario.professorId || usuario.alunoId || null,
      },
    });
  } catch (e) {
    console.error("Erro no Login:", e);
    res.status(500).json({ erro: "Erro interno no servidor" });
  }
};

exports.logout = (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'None' : 'Lax'
  });
  
  res.json({ mensagem: "Logout efetuado com sucesso" });
};

// --- REGISTER ---
exports.register = async (req, res) => {
  try {
    const { username, senha } = req.body;
    const usuarioExistente = await Usuario.findOne({ where: { username } });
    if (usuarioExistente) return res.status(400).json({ erro: "Usuário já existe." });

    const novoUsuario = await Usuario.create({ username, senha, role: "pendente" });
    res.status(201).json({ mensagem: "Usuário criado com sucesso!", usuario: { id: novoUsuario.id, username: novoUsuario.username } });
  } catch (e) {
    res.status(500).json({ erro: "Erro ao criar usuário." });
  }
};

// --- ALTERAR SENHA LOGADO ---
exports.alterarSenhaObrigatoria = async (req, res) => {
  try {
    const schema = Joi.object({
      senhaAtual: Joi.string().required(),
      novaSenha: Joi.string().min(6).required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ erro: error.details[0].message });

    const { senhaAtual, novaSenha } = value;
    const usuarioId = req.usuarioId;

    const usuario = await Usuario.findByPk(usuarioId);
    if (!usuario) return res.status(404).json({ erro: "Usuário não encontrado." });

    // 3. Verificar Senha Atual
    const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha);
    if (!senhaValida) return res.status(401).json({ erro: "A senha atual está incorreta." });

    // 4. Verificar se a nova é igual à antiga
    const mesmaSenha = await bcrypt.compare(novaSenha, usuario.senha);
    if (mesmaSenha) return res.status(400).json({ erro: "A nova senha não pode ser igual à atual." });

    // 5. ENCRIPTAÇÃO MANUAL (Garantia de segurança)
    const salt = await bcrypt.genSalt(10);
    usuario.senha = await bcrypt.hash(novaSenha, salt);
    usuario.deve_alterar_senha = false; 
    
    await usuario.save();

    res.json({ mensagem: "Senha alterada com sucesso!" });

  } catch (e) {
    console.error("Erro ao alterar senha:", e);
    res.status(500).json({ erro: "Erro interno no servidor." });
  }
};

// --- RECUPERAÇÃO: 1. ESQUECI SENHA ---
exports.esqueciSenha = async (req, res) => {
  try {
    const { email } = req.body;
    const schema = Joi.object({
      email: Joi.string().email().required().messages({
        "string.email": "Insira um formato de e-mail válido.",
        "any.required": "O e-mail é obrigatório."
      })
    });
    const { error } = schema.validate({ email });
    if (error) {
      return res.status(400).json({ erro: error.details[0].message });
    }
    const usuario = await Usuario.findOne({ 
      where: { 
        email: { [Op.iLike]: email.trim() } 
      } 
    });

    if (!usuario) {
      return res.status(404).json({ erro: "E-mail não encontrado." });
    }

    const token = crypto.randomBytes(20).toString('hex');
    const expira = new Date(Date.now() + 3600000); // 1 hora

    usuario.reset_token = token;
    usuario.reset_expires = expira;
    await usuario.save(); 

    // Link apontando corretamente para o seu Frontend na Vercel
    const link = `https://ubuntu-web-solution-sige-hila.vercel.app/redefinir-senha/${token}`; 

    // --- ENVIO USANDO NODEMAILER (GMAIL) ---
    const mailOptions = {
      from: `"Hinstec Suporte" <${process.env.EMAIL_USER}>`,
      to: email.trim(),
      subject: 'Recuperação de Senha - Hinstec',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #003366;">Hinstec - Instituto Politécnico</h2>
          <p>Olá, você solicitou a recuperação de senha.</p>
          <p>Clique no botão abaixo para criar uma nova senha. Este link expira em 1 hora.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${link}" style="background-color: #003366; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Redefinir Minha Senha</a>
          </div>
          <p style="font-size: 12px; color: #666;">Se você não solicitou isso, ignore este e-mail.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    
    res.json({ mensagem: "E-mail de recuperação enviado com sucesso!" });

  } catch (error) {
    console.error("Erro no envio de e-mail:", error);
    res.status(500).json({ erro: "Falha ao enviar e-mail. Tente novamente mais tarde." });
  }
};

// --- RECUPERAÇÃO: 2. REDEFINIR SENHA ---


exports.redefinirSenha = async (req, res) => {
  try {
    // 1. Validação Joi
    const schema = Joi.object({
      token: Joi.string().required().messages({
        "any.required": "O token de recuperação é obrigatório.",
        "string.empty": "Token inválido."
      }),
      novaSenha: Joi.string().min(6).required().messages({
        "string.min": "A nova senha deve ter pelo menos 6 caracteres.",
        "any.required": "A nova senha é obrigatória."
      }),
    });

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ erro: error.details[0].message });

    const { token, novaSenha } = value;

    // 2. Buscar usuário com token válido e dentro do prazo
    const usuario = await Usuario.findOne({
      where: {
        reset_token: token,
        reset_expires: { 
          [Op.gt]: new Date() 
        }
      }
    });

    if (!usuario) {
      return res.status(400).json({ erro: "Este link de recuperação é inválido ou já expirou." });
    }

    // 3. Atualizar a senha
    // IMPORTANTE: Se o seu Model tem o hook beforeSave, use apenas:
    usuario.senha = novaSenha;
    
    /* NOTA: Se o seu Model NÃO tiver o hook de hash automático, 
       descomente as linhas abaixo e apague a linha acima:*/
       
       const salt = await bcrypt.genSalt(10);
       usuario.senha = await bcrypt.hash(novaSenha, salt);
    

    // 4. Limpar campos de recuperação e forçar troca futura (opcional)
    usuario.reset_token = null;
    usuario.reset_expires = null;
    usuario.deve_alterar_senha = false; // Garante que ele entre direto após recuperar
    
    await usuario.save();

    res.json({ mensagem: "Senha redefinida com sucesso! Já pode entrar no sistema." });

  } catch (error) {
    console.error("Erro no redefinirSenha:", error);
    res.status(500).json({ erro: "Erro interno ao processar a nova senha." });
  }
};