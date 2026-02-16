"# gestao-escolar" 
# 📚 Sistema Escolar - Backend

## 📋 Visão Geral

Backend completo de gestão escolar desenvolvido com **Node.js** e **Express**. Sistema robusto para gerenciar matrículas, presença, notas, pagamentos e configurações administrativas de instituições educacionais.

---

## 🏗️ Arquitetura

```
backend/
├── config/              # Configurações (Passport, Banco de Dados)
├── controllers/         # Lógica de negócio
├── models/             # Modelos Sequelize
├── routes/             # Rotas da API
├── middleware/         # Middlewares (autenticação, validação)
├── utils/              # Utilitários
├── .env                # Variáveis de ambiente
└── server.js           # Entrada principal
```

### Tecnologias Principais

| Tecnologia | Versão | Função |
|-----------|--------|--------|
| **Node.js** | 18+ | Runtime |
| **Express.js** | ^4.18.0 | Framework Web |
| **Sequelize** | ^6.35.0 | ORM |
| **PostgreSQL** | (Supabase) | Banco de Dados |
| **Passport.js** | ^0.7.0 | Autenticação |
| **bcryptjs** | ^2.4.3 | Hash de Senhas |
| **Joi** | ^17.11.0 | Validação |
| **Multer** | ^1.4.5 | Upload de Arquivos |
| **Helmet** | ^7.1.0 | Segurança HTTP |
| **CORS** | ^2.8.5 | Cross-Origin |
| **Dotenv** | ^16.3.1 | Variáveis de Ambiente |

---

## 🚀 Instalação

### Pré-requisitos

- **Node.js** v18+ instalado
- **npm** ou **yarn**
- Conta **Supabase** ativa
- Variáveis de ambiente configuradas

### Passo 1: Clonar Repositório

```bash
cd c:\Users\administrator\Documents\node\
git clone <seu-repositorio>
cd sistema-escolar\backend
```

### Passo 2: Instalar Dependências

```bash
npm install
```

Ou com yarn:

```bash
yarn install
```

### Passo 3: Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do backend:

```env
# Servidor
NODE_ENV=development
PORT=5000
HOST=localhost

# Banco de Dados (Supabase)
DB_HOST=seu-supabase-host.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USERNAME=postgres
DB_PASSWORD=sua-senha-supabase
DB_URL=postgresql://postgres:sua-senha@seu-host.supabase.co:5432/postgres

# Supabase Storage
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-publica
SUPABASE_SECRET_KEY=sua-chave-secreta
SUPABASE_BUCKET=seu-bucket-nome

# JWT / Sessão
JWT_SECRET=sua-chave-secreta-jwt
SESSION_SECRET=sua-chave-sessao

# CORS
CORS_ORIGIN=http://localhost:5173,https://seu-dominio.com

# Email (Opcional)
SMTP_HOST=smtp.seuservidor.com
SMTP_PORT=587
SMTP_USER=seu-email
SMTP_PASS=sua-senha

# Ambiente Frontend
VITE_API_URL=http://localhost:5000
```

### Passo 4: Sincronizar Banco de Dados

```bash
npm run db:sync
```

Ou executar migrations:

```bash
npm run migrate
```

### Passo 5: Iniciar Servidor

**Modo Desenvolvimento** (com hot-reload):

```bash
npm run dev
```

**Modo Produção**:

```bash
npm start
```

O servidor estará rodando em `http://localhost:5000`

---

## 📚 Estrutura do Banco de Dados

### Tabelas Principais

#### 1. **usuarios**
Autenticação e autorização de todos os usuários.

```sql
id | email | senha | role | status | createdAt | updatedAt
   |       |       |("admin","professor","aluno","diretor","pendente")|
```

#### 2. **alunos**
Dados pessoais e acadêmicos dos alunos.

```sql
id | usuarioId | nome | dataNascimento | endereco | telefone | 
   | genero | foto | statusMatricula (pendente|doc_aprovado|ativo)
```

#### 3. **presencas**
Registro de frequência por disciplina e data.

```sql
id | alunoId | disciplinaId | data | status (F|P|FJ) | motivo | createdAt
```

#### 4. **disciplinas**
Matérias oferecidas pela instituição.

```sql
id | nome | descricao | cargaHoraria | vocacional (true|false)
```

#### 5. **pagamentos**
Transações financeiras e propinas.

```sql
id | alunoId | valor | dataVencimento | dataPagamento | 
   | status (pendente|pago|vencido) | comprovante
```

#### 6. **avisos**
Notificações para alunos e turmas.

```sql
id | titulo | conteudo | turmaId | dataPublicacao | 
   | dataExpiracao | lido (true|false)
```

#### 7. **cursos**
Programas educacionais.

```sql
id | nome | descricao | duracao | nivelVocacional
```

#### 8. **turmas**
Agrupamentos de alunos.

```sql
id | cursoId | nome | anoLetivo | turno (manhã|tarde|noite)
```

#### 9. **horarios**
Estrutura de aulas por dia/tempo.

```sql
id | turmaId | disciplinaId | professorId | diaSemana 
   | tempoAula | sala | semi_presencial (true|false)
```

---

## 🔌 Endpoints da API

### 🔐 Autenticação

#### POST `/api/auth/login`
Login de usuário.

**Request:**
```json
{
  "email": "aluno@email.com",
  "senha": "senha123"
}
```

**Response (200):**
```json
{
  "id": 1,
  "email": "aluno@email.com",
  "role": "aluno",
  "token": "jwt-token-aqui"
}
```

#### POST `/api/auth/logout`
Faz logout do usuário.

**Response (200):**
```json
{ "mensagem": "Logout realizado com sucesso" }
```

---

### 📝 Matrículas

#### POST `/api/matricula/criar`
Registro de nova inscrição (upload de documento).

**Request (multipart/form-data):**
```json
{
  "nome": "João Silva",
  "email": "joao@email.com",
  "dataNascimento": "2005-03-15",
  "telefone": "84999999999",
  "endereco": "Rua A, 123",
  "genero": "M",
  "documento": <arquivo-pdf>
}
```

**Response (201):**
```json
{
  "id": 1,
  "usuarioId": 5,
  "nome": "João Silva",
  "statusMatricula": "pendente",
  "documentoUrl": "https://supabase.../documento.pdf",
  "createdAt": "2026-02-11T10:30:00Z"
}
```

#### GET `/api/matricula/:id`
Consultar status da matrícula.

**Response (200):**
```json
{
  "id": 1,
  "statusMatricula": "doc_aprovado",
  "dataSolicitacao": "2026-02-11",
  "dataAprovacao": "2026-02-12"
}
```

#### GET `/api/matricula`
Listar todas as inscrições (admin/secretaria).

**Response (200):**
```json
[
  {
    "id": 1,
    "aluno": { "nome": "João Silva", "email": "joao@email.com" },
    "statusMatricula": "pendente",
    "dataSolicitacao": "2026-02-11"
  }
]
```

#### PATCH `/api/matricula/:id/aprovar`
Aprovar inscrição (admin).

**Response (200):**
```json
{ "mensagem": "Matrícula aprovada com sucesso", "statusMatricula": "doc_aprovado" }
```

---

### 👨‍🎓 Alunos

#### GET `/api/aluno/faltas/:id`
Consultar faltas de um aluno com cálculo de percentual.

**Query Params:**
- `disciplinaId` (opcional): Filtro por disciplina
- `dataInicio` (opcional): Formato YYYY-MM-DD
- `dataFim` (opcional): Formato YYYY-MM-DD

**Response (200):**
```json
{
  "alunoId": 1,
  "disciplinas": [
    {
      "disciplinaId": 3,
      "nomeDisciplina": "Matemática",
      "vocacional": false,
      "faltas": [
        {
          "data": "2026-01-15",
          "status": "F",
          "motivo": null
        },
        {
          "data": "2026-01-20",
          "status": "FJ",
          "motivo": "Atestado médico"
        }
      ],
      "totalFaltas": 2,
      "totalFaltasJustificadas": 1,
      "percentualPresenca": 92.5,
      "status": "Regular"
    }
  ]
}
```

#### POST `/api/aluno/justificar-faltas`
Adicionar justificativa a uma ou mais faltas.

**Request:**
```json
{
  "alunoId": 1,
  "datas": ["2026-01-15", "2026-01-20"],
  "motivo": "Problema de saúde"
}
```

**Response (200):**
```json
{
  "mensagem": "Faltas justificadas com sucesso",
  "faltasJustificadas": 2
}
```

#### GET `/api/aluno/:id`
Detalhes completos do aluno.

**Response (200):**
```json
{
  "id": 1,
  "nome": "João Silva",
  "email": "joao@email.com",
  "dataNascimento": "2005-03-15",
  "genero": "M",
  "endereco": "Rua A, 123",
  "statusMatricula": "doc_aprovado",
  "turmaId": 2,
  "turmaNome": "10º A"
}
```

#### GET `/api/aluno`
Listar todos os alunos com filtros.

**Query Params:**
- `turmaId`: Filtro por turma
- `statusMatricula`: Filtro por status
- `busca`: Busca por nome/email

**Response (200):**
```json
{
  "total": 150,
  "pagina": 1,
  "alunos": [...]
}
```

---

### 👨‍🏫 Professores

#### GET `/api/professor/horarios/:id`
Obter horário completo de um professor com estrutura de dias/tempos.

**Response (200):**
```json
{
  "professorId": 1,
  "nome": "Dr. Silva",
  "horarios": {
    "segunda": {
      "manhã": [
        {
          "tempo": 1,
          "disciplina": "Matemática",
          "turma": "10º A",
          "sala": "101",
          "semiPresencial": false
        }
      ],
      "tarde": [],
      "noite": []
    },
    "terça": {...},
    "quarta": {...},
    "quinta": {...},
    "sexta": {...},
    "sábado": [
      {
        "disciplina": "Laboratório",
        "turma": "10º A",
        "semiPresencial": true
      }
    ]
  },
  "temPeriodosNaoPresencial": true
}
```

#### POST `/api/professor/presenca`
Registrar presença de alunos em uma aula.

**Request:**
```json
{
  "professorId": 1,
  "alunoIds": [1, 2, 3, 4],
  "disciplinaId": 5,
  "data": "2026-02-11",
  "presentes": [1, 2, 4],
  "ausentes": [3]
}
```

**Response (201):**
```json
{
  "mensagem": "Presença registrada com sucesso",
  "registos": 4,
  "data": "2026-02-11"
}
```

#### GET `/api/professor/turma/:turmaId/alunos`
Listar alunos de uma turma.

**Response (200):**
```json
{
  "turmaId": 2,
  "turmaNome": "10º A",
  "alunos": [
    {
      "id": 1,
      "nome": "João Silva",
      "email": "joao@email.com",
      "statusMatricula": "doc_aprovado"
    }
  ]
}
```

---

### 💰 Pagamentos

#### GET `/api/aluno/pagamentos`
Listar pagamentos do aluno autenticado.

**Query Params:**
- `status`: pending, paid, overdue
- `ano`: Filtro por ano

**Response (200):**
```json
{
  "aluno": "João Silva",
  "pagamentos": [
    {
      "id": 1,
      "mês": "Janeiro",
      "valor": 500.00,
      "dataVencimento": "2026-01-31",
      "dataPagamento": "2026-01-25",
      "status": "pago",
      "comprovante": "url-do-pdf"
    },
    {
      "id": 2,
      "mês": "Fevereiro",
      "valor": 500.00,
      "dataVencimento": "2026-02-28",
      "dataPagamento": null,
      "status": "pendente",
      "diasVencidos": 0
    }
  ],
  "resumo": {
    "total": 1000.00,
    "pago": 500.00,
    "pendente": 500.00
  }
}
```

#### GET `/api/propinas/relatorio`
Relatório consolidado de propinas (admin/diretor).

**Query Params:**
- `alunoId`: Filtro por aluno
- `cursoId`: Filtro por curso
- `status`: Filtro por status
- `mes`: Formato MM/YYYY

**Response (200):**
```json
{
  "totalAlunos": 150,
  "totalArrecadado": 75000.00,
  "totalPendente": 25000.00,
  "taxaArrecadacao": "75%",
  "detalhesAluno": [
    {
      "alunoId": 1,
      "nome": "João Silva",
      "curso": "Curso A",
      "totalPropinas": 5000.00,
      "pago": 2500.00,
      "pendente": 2500.00,
      "status": "Adimplente"
    }
  ]
}
```

#### POST `/api/pagamento/gerar-recibo/:pagamentoId`
Gerar recibo em PDF.

**Response (200):**
```
Retorna PDF para download
```

---

### ⚙️ Configurações

#### GET `/api/config/estrutura`
Obter estrutura completa da instituição.

**Response (200):**
```json
{
  "instituicao": {
    "nome": "Escola UBUNTO",
    "logo": "url-logo"
  },
  "cursos": [
    {
      "id": 1,
      "nome": "Curso Técnico em Informática",
      "nivelVocacional": true,
      "duracao": "2 anos"
    }
  ],
  "turmas": [
    {
      "id": 1,
      "nome": "10º A",
      "cursoId": 1,
      "anoLetivo": 2026,
      "turno": "manhã"
    }
  ],
  "turnos": ["manhã", "tarde", "noite"],
  "tempos": [1, 2, 3, 4, 5, 6]
}
```

#### POST `/api/config/salvar`
Salvar configurações da instituição.

**Request:**
```json
{
  "instituicao": {
    "nome": "Escola UBUNTO - Sistema de Gestão Escolar",
    "logo": "url-nova-logo"
  },
  "novoCurso": {
    "nome": "Curso A",
    "duracao": "2 anos",
    "nivelVocacional": true
  },
  "novasTurmas": [
    {
      "nome": "10º A",
      "cursoId": 1,
      "anoLetivo": 2026,
      "turno": "manhã"
    }
  ]
}
```

**Response (200):**
```json
{
  "mensagem": "Configurações salvas com sucesso",
  "estrutura": {...}
}
```

---

### 📢 Avisos

#### GET `/api/aluno/avisos`
Listar avisos ativos para o aluno.

**Response (200):**
```json
[
  {
    "id": 1,
    "titulo": "Imprescindível comparecer à reunião de pais",
    "conteudo": "Reunião de pais e encarregados de educação...",
    "dataPublicacao": "2026-02-11",
    "dataExpiracao": "2026-02-28",
    "lido": false
  }
]
```

#### POST `/api/aviso/criar`
Criar novo aviso (admin/diretor).

**Request:**
```json
{
  "titulo": "Avisos Importantes",
  "conteudo": "Conteúdo do aviso...",
  "turmaIds": [1, 2, 3],
  "dataExpiracao": "2026-02-28"
}
```

**Response (201):**
```json
{
  "id": 1,
  "titulo": "Avisos Importantes",
  "alunosNotificados": 150
}
```

---

## 🔐 Segurança

### Implementações de Segurança

```javascript
// helmet: Proteção de headers HTTP
const helmet = require('helmet');
app.use(helmet());

// CORS: Controle de origem
app.use(cors({
  origin: process.env.CORS_ORIGIN.split(','),
  credentials: true
}));

// Rate Limiting: Máx 100 requisições por 15 min
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Muitas requisições deste IP'
});
app.use('/api/', limiter);

// Criptografia de senhas
const bcrypt = require('bcryptjs');
// Hook automático no modelo Usuario
Usuario.addHook('beforeCreate', async (usuario) => {
  usuario.senha = await bcrypt.hash(usuario.senha, 10);
});

// Validação de entrada
const Joi = require('joi');
const schema = Joi.object({
  email: Joi.string().email().required(),
  senha: Joi.string().min(6).required()
});
```

### Autenticação

- **JWT** para APIs stateless
- **Sessions** para web tradicional
- **Roles-based Access Control**: admin, professor, aluno, diretor
- **Middleware de verificação** em todas as rotas protegidas

---

## 🛠️ Scripts Disponíveis

```bash
# Iniciar em desenvolvimento (hot-reload com nodemon)
npm run dev

# Iniciar em produção
npm start

# Sincronizar banco de dados
npm run db:sync

# Executar migrations
npm run migrate

# Executar seeds (dados iniciais)
npm run seed

# Testes unitários
npm test

# Linting
npm run lint

# Verificar segurança
npm audit
```

---

## 📊 Fluxos Principais

### 1. Inscrição → Matrícula → Acesso

```
1. POST /api/matricula/criar
   ↓
2. Arquivo salvo em Supabase Storage
   ↓
3. Usuario criado com role: "pendente"
   ↓
4. PATCH /api/matricula/:id/aprovar (admin)
   ↓
5. Role muda para "aluno" | status: "doc_aprovado"
   ↓
6. Aluno acessa GET /api/aluno/avisos
```

### 2. Aula → Presença → Relatório

```
1. POST /api/professor/presenca (registro de frequência)
   ↓
2. Salva em tabela `presencas`
   ↓
3. GET /api/aluno/faltas/:id (cálculo automático)
   ↓
4. Backend retorna percentual e status (Regular/Crítico)
   ↓
5. POST /api/aluno/justificar-faltas (justificativa retroativa)
```

### 3. Propina → Pagamento → Recibo

```
1. Sistema gera propinas mensais automaticamente
   ↓
2. GET /api/aluno/pagamentos (aluno visualiza)
   ↓
3. Pagamento processado (integração gateway)
   ↓
4. GET /api/pagamento/gerar-recibo/:id (PDF)
   ↓
5. GET /api/propinas/relatorio (admin consolidado)
```

---

## 🌐 Variáveis de Ambiente Detalhadas

| Variável | Tipo | Exemplo | Descrição |
|----------|------|---------|-----------|
| `NODE_ENV` | string | development \| production | Ambiente de execução |
| `PORT` | number | 5000 | Porta do servidor |
| `HOST` | string | localhost | Host do servidor |
| `DB_HOST` | string | seu-projeto.supabase.co | Host PostgreSQL |
| `DB_PORT` | number | 5432 | Porta PostgreSQL |
| `DB_NAME` | string | postgres | Nome banco de dados |
| `DB_USERNAME` | string | postgres | Usuário BD |
| `DB_PASSWORD` | string | senha-forte | Senha BD |
| `SUPABASE_URL` | string | https://seu-projeto.supabase.co | URL Supabase |
| `SUPABASE_KEY` | string | chave-publica | Chave pública Supabase |
| `SUPABASE_BUCKET` | string | documentos | Bucket para uploads |
| `JWT_SECRET` | string | chave-aleatoria-forte | Secret JWT |
| `SESSION_SECRET` | string | chave-aleatoria-forte | Secret sessão |
| `CORS_ORIGIN` | string | http://localhost:5173 | Origins CORS permitidas |

---

## 🐛 Debug e Troubleshooting

### Erro: "ECONNREFUSED" ao conectar no BD

**Solução:**
```bash
# Verificar credenciais no .env
# Verificar se Supabase está online
# Testar conexão:
node -e "const { Sequelize } = require('sequelize'); 
const seq = new Sequelize(process.env.DB_URL); 
seq.authenticate().then(() => console.log('Conectado!')).catch(console.error);"
```

### Erro: "Multer error: File too large"

**Solução:**
```javascript
// Aumentar limite no server.js
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));
```

### Erro: "CORS error"

**Solução:**
```bash
# Verificar CORS_ORIGIN no .env
# Frontend deve estar na lista
CORS_ORIGIN=http://localhost:5173,https://seu-dominio.com
```

---

## 📞 Suporte

Para dúvidas ou problemas:

1. Consultar logs: `npm run dev`
2. Verificar banco de dados no dashboard Supabase
3. Testar endpoints com Postman/Insomnia
4. Revisar variáveis de ambiente

---

## 📄 Licença

Uso exclusivo - Sistema UBUNTO de Gestão Escolar 2026

---

**Última atualização:** 11 de Fevereiro de 2026
**Versão:** 1.0.0
