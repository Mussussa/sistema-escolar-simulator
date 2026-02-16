const multer = require('multer');

// --- MUDANÇA PRINCIPAL: Usar memoryStorage em vez de diskStorage ---
const storage = multer.memoryStorage(); 

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Permite PDF para matrículas e Excel/PDF para professores
    const extensoesPermitidas = [
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ];

    if (extensoesPermitidas.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de arquivo inválido! Apenas PDF ou Excel são permitidos.'), false);
    }
  },
  limits: { 
    fileSize: 5 * 1024 * 1024 // 10MB
  } 
});

module.exports = upload;