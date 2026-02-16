const express = require("express");
const router = express.Router();
const professorController = require("../controllers/professorController");

const authMiddleware = require("../middleware/auth"); // Importa o segurança

// Todas as rotas abaixo agora exigem o Token
router.use(authMiddleware);

// Rota para o professor ver sua grade de aulas semanal
router.get("/horarios/:professorId", professorController.getMeusHorarios);

// Rota para listar alunos de uma turma específica
router.get("/turma/:turmaId/alunos", professorController.getAlunosPorTurma);

// Rota para salvar notas (ACS/ACP)
router.post("/notas", professorController.salvarNotas);

// Rota para salvar faltas (Chamada diária)
router.post("/presencas", professorController.salvarPresencas);

// Rota para buscar histórico de faltas de um aluno (usada antes de justificar)
router.get("/presencas/faltas-aluno", professorController.getFaltasDoAluno);

// Rota para aplicar a justificativa
//router.put("/presencas/:id", professorController.justificarFalta);
// Buscar faltas por data específica
router.get(
  "/presencas/faltas-por-data",professorController.getFaltasPorData,
);

router.put("/presencas/justificar", professorController.justificarFalta);

// Rota para exportar modelo de planilha de faltas (Excel)
router.get(
  "/turma/:turmaId/disciplina/:disciplinaId/modelo-faltas",
  professorController.gerarModeloFaltas,
);


// --- NOVAS ROTAS PARA AVALIAÇÕES DINÂMICAS ---

// Salvar a configuração de pesos (Teste 1: 30%, Teste 2: 70%, etc)
router.post("/configuracao-notas", professorController.salvarConfiguracaoNotas);

// Buscar a configuração de uma disciplina específica
router.get("/configuracao-notas/:disciplinaId", professorController.getConfiguracaoNotas);

// Obter a pauta completa (Alunos + Notas + Médias calculadas)
router.get("/pauta/:turmaId/:disciplinaId", professorController.getPautaCompleta);


// Rota para importar a planilha preenchida
router.post("/importar-faltas", professorController.importarFaltasPlanilha);
router.post('/notas-finais', professorController.salvarNotasFinais);

module.exports = router;
