const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const auth = require('../middleware/auth');

// --- MIDDLEWARE CORRIGIDO ---
const somenteDono = (req, res, next) => {
  // O seu auth.js já coloca o role diretamente em req.role
  const userRole = req.role; 

  console.log("Role verificada:", userRole); // Debug para ter certeza

  // Verificação simples e direta
  if (userRole !== 'configuracoes') {
    return res.status(403).json({ 
      erro: "Acesso restrito ao dono do sistema." 
    });
  }
  
  next();
};

router.get('/', auth, somenteDono, configController.obterConfiguracao);
router.post('/', auth, somenteDono, configController.salvarConfiguracao);

module.exports = router;