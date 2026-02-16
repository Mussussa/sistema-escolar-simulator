const errorMiddleware = (err, req, res, next) => {
  // Regista o erro detalhado no terminal para o desenvolvedor
  console.error("=== ERRO NO SISTEMA ===");
  console.error(`Mensagem: ${err.message}`);
  console.error(`Caminho: ${req.method} ${req.originalUrl}`);
  console.error(err.stack); // Mostra onde o erro ocorreu no código
  console.error("=======================");

  // Define o status code (se o erro já tiver um, usa ele, senão usa 500)
  const statusCode = err.statusCode || 500;

  // Resposta amigável para o Frontend (Vercel)
  res.status(statusCode).json({
    erro: true,
    mensagem: err.message || "Ocorreu um erro interno no servidor.",
    detalhes: process.env.NODE_ENV === "development" ? err.stack : undefined 
    // ^ Só mostra o stack trace se estiveres em modo de desenvolvimento
  });
};

module.exports = errorMiddleware;