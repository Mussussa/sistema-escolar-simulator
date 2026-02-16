const express = require("express");
const router = express.Router();
const alunoController = require("../controllers/alunoController");
const authMiddleware = require("../middleware/auth"); // Seu middleware de JWT

// Todas as rotas abaixo exigem login
router.use(authMiddleware);

// Rota principal do Dashboard
router.get("/dashboard", alunoController.obterPainelAcademico);

// Rota para o boletim
router.get("/notas", alunoController.obterNotasAlunoConsolidado);

router.get("/faltas", alunoController.obterFaltasAluno);
// ...
router.get("/avisos", alunoController.obterAvisosAluno);
// NOVA ROTA: Histórico de Propinas
router.get("/pagamentos", alunoController.obterHistoricoPagamentos);

module.exports = router;