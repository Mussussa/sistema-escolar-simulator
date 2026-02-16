const express = require('express');
const { sequelize } = require('./models/index'); 
require('dotenv').config();
const cors = require('cors'); 
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser'); // Importante para os Cookies

// --- IMPORTAÇÃO DAS ROTAS ---
const configRoutes = require('./routes/configRoutes');
const diretorRoutes = require('./routes/diretorRoutes');
const professorRoutes = require("./routes/professorRoutes");
const authRoutes = require('./routes/authRoutes');
const matriculaRoutes = require('./routes/matriculaRoutes');
const alunoRoutes = require("./routes/alunoRoutes");
const publicasRoutes = require("./routes/publicasRoutes");
const errorMiddleware = require("./middleware/errorMiddleware");

// Jobs
const faturamentoJob = require('./jobs/faturamento');

const app = express();

// IMPORTANTE: Necessário para o Render/Vercel saberem que estão atrás de um proxy (HTTPS)
app.set('trust proxy', 1);

// --- 1. SEGURANÇA (HELMET) ---
app.use(helmet({
  crossOriginResourcePolicy: false, // Permite carregar imagens/arquivos
}));

// --- 2. CORS (A CORREÇÃO ESTÁ AQUI) ---
// Função dinâmica para aceitar Vercel e Localhost
const corsOptions = {
  origin: (origin, callback) => {
    // !origin permite requisições sem origem (como Postman ou Apps Mobile)
    if (!origin) return callback(null, true);

    // Lista de domínios permitidos explicitamente
    const allowedOrigins = [
      "http://localhost:5173", // Teu frontend local
      "https://ubuntu-web-solution-sige-hila.vercel.app" ,// Teu domínio principal
      "https://ubuntu-web-git-a857c3-ismael-mussussa-chaibos-projects-e97eddce.vercel.app/"// testes
    ];

    // Verifica se está na lista OU se é um subdomínio da Vercel (para os deploys de teste)
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith(".vercel.app")) {
      callback(null, true);
    } else {
      console.log("Bloqueado pelo CORS:", origin); // Ajuda no debug
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // <--- OBRIGATÓRIO PARA COOKIES
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
};

app.use(cors(corsOptions));

// --- 3. PARSERS (COOKIES E JSON) ---
app.use(cookieParser()); // <--- TEM DE VIR ANTES DAS ROTAS
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 4. RATE LIMIT ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 pedidos por IP
  message: { erro: "Muitas requisições vindas deste IP. Tente novamente mais tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});
// Aplica o limitador apenas nas rotas de API
app.use('/api/', limiter);

// --- 5. ARQUIVOS ESTÁTICOS ---
app.use('/files', express.static(path.join(__dirname, 'uploads')));
app.use('/comprovativos', express.static(path.join(__dirname, 'uploads/comprovativos')));

// --- 6. SINCRONIZAÇÃO BD ---
async function syncDB() {
  try {
    await sequelize.sync({ force: false, alter: true });
    console.log("✅ Tabelas sincronizadas!");
  } catch (error) {
    console.error("❌ Erro ao sincronizar tabelas:", error);
  }
}
syncDB();

// --- 7. ROTAS ---
app.get("/ping", (req, res) => res.status(200).send("pong"));

app.use('/api/auth', authRoutes);
app.use('/api/diretor', diretorRoutes);
app.use('/api/configuracoes', configRoutes);
app.use("/api/professor", professorRoutes);
app.use("/api/matricula", matriculaRoutes);
app.use("/api/aluno", alunoRoutes);
app.use("/validar", publicasRoutes);

// --- 8. ERROR HANDLER (SEMPRE EM ÚLTIMO) ---
app.use(errorMiddleware);

// --- 9. SERVER START ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  
  // JOB FATURAMENTO
  try {
    faturamentoJob(); 
    console.log('✅ Agendador de faturamento ativado');
  } catch (error) {
    console.error('❌ Falha ao iniciar agendador:', error);
  }
});