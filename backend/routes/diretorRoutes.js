const express = require('express');
const router = express.Router();
const diretorController = require('../controllers/diretorController');
const upload = require('../config/multer');
const propinasController = require('../controllers/propinasController');
const auth = require('../middleware/auth');

// Middleware para Direção Geral
const somenteDiretor = (req, res, next) => {
  if (req.role !== 'admin' && req.role !== 'configuracoes' && req.role !== 'propinas' && req.role !== 'aluno') { 
    return res.status(403).json({ erro: "Acesso restrito à direção." });
  }
  next();
};

// Middleware para Financeiro (Corrigido: nome e verificação do role)
const somenteFinanceiro = (req, res, next) => {
  // Ajustado para aceitar 'propinas' ou 'admin', conforme sua lógica de roles
  if (req.role !== 'propina' && req.role !== 'admin') { 
    return res.status(403).json({ erro: "Acesso restrito à direção financeira." });
  }
  next();
};

// --- Rotas do Diretor (Acadêmico/Admin) ---
router.get('/cursos', auth, somenteDiretor, diretorController.obtercurso);
router.get('/turmas', auth, somenteFinanceiro, diretorController.obterturmas);
router.get('/professores', auth, somenteDiretor, diretorController.obterProfessores);
router.post('/professores', auth, upload.single('bi'), somenteDiretor, diretorController.registarProfessor);
//router.post('/turmas', auth, somenteDiretor, diretorController.criarTurma);
router.delete('/professores/:id', auth, somenteDiretor, diretorController.deletarProfessor);

// Gestão de Horários e Disciplinas
router.get('/horarios/:turmaId', auth, somenteDiretor, diretorController.obterHorarioTurma);
router.post('/horarios', auth, somenteDiretor, diretorController.salvarHorario);
router.post('/disciplinas', auth, somenteDiretor, diretorController.salvarDisciplinas);
router.get('/disciplinas', auth, somenteDiretor, diretorController.buscarDisciplinas);

// Aprovação de Usuários
router.get("/usuarios-pendentes", auth, somenteDiretor, diretorController.listarPendentes);
router.post("/aprovar-professor", auth, somenteDiretor, diretorController.aprovarComoProfessor);

// Mural de Avisos
router.post('/avisos', auth, somenteDiretor, diretorController.criarAviso);
router.get('/avisos', auth, somenteDiretor, diretorController.obterAviso);
router.delete('/avisos/:id', auth, somenteDiretor, diretorController.removerAviso);

// --- Mural Financeiro (Propinas) ---

// 1. Estatísticas dos Cards
router.get('/propinas/estatisticas', auth, somenteFinanceiro, propinasController.obterEstatisticasPropinas);

// 2. Lista de Alunos e Condição Financeira (Mural)
router.get('/propinas/lista', auth, somenteFinanceiro, propinasController.listarPagamentosMural);

router.get("/turmas", auth, somenteFinanceiro, propinasController.listarTodasTurmas);

// 3. Rota NOVA: Gerar fatura para aluno que está "Sem Registro"
router.post('/propinas/gerar-fatura', auth, somenteFinanceiro, propinasController.gerarFaturaAluno);

// 4. Aprovar/Confirmar Pagamento
router.patch('/propinas/aprovar/:id', auth, somenteFinanceiro, propinasController.aprovarPagamento);

module.exports = router;