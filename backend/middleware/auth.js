const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  // 1. Tenta pegar o token diretamente dos Cookies
  // Nota: Isso só funciona se você instalou e configurou o 'cookie-parser' no server.js
  const token = req.cookies.token;

  // 2. Se não houver token no cookie, rejeita o acesso
  if (!token) {
    return res.status(401).json({ erro: "Acesso negado. Faça login novamente." });
  }

  // 3. Verifica se o token é válido
  jwt.verify(token, process.env.JWT_SECRET || "CHAVE_MESTRA_ESCOLAR_2024", (err, decoded) => {
    if (err) {
      return res.status(401).json({ erro: "Sessão expirada ou inválida." });
    }

    // 4. Se o token for válido, anexa os dados ao request (igual ao que tinhas antes)
    req.usuarioId = decoded.id;
    req.professorId = decoded.professorId;
    req.alunoId = decoded.alunoId;
    req.role = decoded.role;

    return next();
  });
};