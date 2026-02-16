const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Rota principal de login: http://localhost:5000/api/auth/login
router.post('/login', authController.login);
router.post('/logout', authController.logout);
//router.post('/register', authController.register);
router.post("/alterar-senha-obrigatoria", auth, authController.alterarSenhaObrigatoria);
//router.post('/alterar-senha', auth, authController.alterarSenhaVoluntaria);

// --- ROTAS DE RECUPERAÇÃO DE SENHA (Públicas) ---

// 1. Passo 1: O aluno informa o e-mail -> Sistema envia o link
router.post('/esqueceu-senha', authController.esqueciSenha);

// 2. Passo 2: O aluno clica no link e envia a nova senha + token
router.post('/redefinir-senha', authController.redefinirSenha);


module.exports = router;