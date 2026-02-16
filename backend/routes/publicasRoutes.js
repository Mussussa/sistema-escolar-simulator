const express = require("express");
const router = express.Router();
const publicoController = require("../controllers/publicoController");

// Define a sub-rota (o /validar já vem do server.js)
router.get("/:referencia", publicoController.validarReciboPublico);




module.exports = router; // <--- O server.js precisa disto!