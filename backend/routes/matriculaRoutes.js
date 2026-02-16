const express = require("express");
const router = express.Router();
const matriculaController = require("../controllers/matriculaController");
const upload = require("../config/multer");
const {
  Aluno,
  Usuario,
  Turma,
  Curso,
  Nota,
  Pagamento,
  Disciplina, // Faltava este
  ConfiguracaoAvaliacao,
  sequelize,
} = require("../models");
const Joi = require("joi");
const { Op } = require("sequelize");
const auth = require("../middleware/auth");
const somenteMatricula = (req, res, next) => {
  if (req.role !== "matricula") {
    return res.status(403).json({ erro: "Acesso restrito à direção." });
  }
  next();
};

// --- ROTAS DO ALUNO/CANDIDATO ---

// 1. Inscrição (Pública)
router.post(
  "/inscrever",
  upload.single("documento"),
  matriculaController.inscreverCandidato,
);
router.get("/cursos", matriculaController.obterCursos);

router.put("/rejeitar/:alunoId", matriculaController.rejeitarMatricula);

router.get(
  "/busca-global",
  auth,
  somenteMatricula,
  matriculaController.buscaGlobal,
);

router.get("/disciplinas-regularizacao/:alunoId", auth, somenteMatricula ,matriculaController.getDisciplinasParaRegularizar);

router.post( "/regularizar-veterano",auth, somenteMatricula, matriculaController.regularizarVeterano);

// 2. Buscar status do aluno logado (Usada no Componente StatusMatricula)


router.get("/meu-status/:usuarioId", async (req, res) => {
  try {
    // 1. Esquema de Validação Joi para o parâmetro da URL
    const schema = Joi.object({
      usuarioId: Joi.string().uuid().required().messages({
        "string.guid": "O identificador do usuário é inválido.",
        "any.required": "O ID do usuário é obrigatório."
      })
    });

    // 2. Executar a validação
    const { error } = schema.validate(req.params);
    if (error) {
      return res.status(400).json({ erro: error.details[0].message });
    }

    const { Aluno } = require("../models");

    // 3. Busca o aluno vinculado ao usuarioId
    const aluno = await Aluno.findOne({
      where: { usuarioId: req.params.usuarioId },
      attributes: [
        "nome",
        "progresso",
        "status",
        "ultima_classe",
        "pago",
        "escola_anterior",
        "tipo_sanguineo",
        "alergias",
        "contato_nome",
        "telefone_emergencia",
        "motivo_rejeicao",
        "createdAt",
      ],
    });

    if (!aluno) {
      return res.status(404).json({ erro: "Dados do aluno não encontrados para este usuário." });
    }

    res.json(aluno);
  } catch (err) {
    console.error("Erro ao buscar status:", err);
    res.status(500).json({ erro: "Erro interno ao buscar informações de status." });
  }
});

// --- ROTAS DO DIRETOR (GESTÃO) ---

// 3. Listar todos os pendentes (Para a tabela do Diretor)
// No React: api.get('/matricula/pendentes')
router.get("/pendentes", auth, somenteMatricula, async (req, res) => {
  try {
    const pendentes = await Usuario.findAll({
      where: { role: "pendente" },
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Aluno,
          as: "aluno",
          where: {
            status: "pendente", // 🔥 FILTRO: Só traz se o status no Aluno for 'pendente'
          },
          attributes: [
            "id",
            "documento_url",
            "nome",
            "ultima_classe",
            "status",
          ],
        },
      ],
    });
    res.json(pendentes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao listar pendentes" });
  }
});
// 4. Aprovar documento e alocar em turma automaticamente



router.put("/aprovar-doc/:id", auth, somenteMatricula, async (req, res) => {
  // 1. ESQUEMAS DE VALIDAÇÃO
  const paramsSchema = Joi.object({
    id: Joi.string().uuid().required().messages({
      "string.guid": "ID do aluno inválido.",
      "any.required": "ID do aluno é obrigatório."
    })
  });

  const bodySchema = Joi.object({
    referenciaManual: Joi.string()
      .trim()
      .pattern(/^[a-zA-Z0-9]{8}\.[a-zA-Z0-9]{4}\.[a-zA-Z0-9]{6}$/)
      .required()
      .messages({
        "string.pattern.base": "Formato de referência inválido (00000000.AAAA.000000).",
        "string.empty": "A referência é obrigatória.",
        "any.required": "O campo referência é obrigatório."
      })
  });

  // 2. EXECUTAR VALIDAÇÕES
  const { error: paramsError } = paramsSchema.validate(req.params);
  if (paramsError) return res.status(400).json({ erro: paramsError.details[0].message });

  const { error: bodyError, value: bodyValue } = bodySchema.validate(req.body);
  if (bodyError) return res.status(400).json({ erro: bodyError.details[0].message });

  const { referenciaManual } = bodyValue;
  const t = await sequelize.transaction();

  try {
    // --- 3. LOCALIZAR ALUNO ---
    const aluno = await Aluno.findByPk(req.params.id, {
      include: [{ model: Curso, as: "curso" }],
      transaction: t,
    });

    if (!aluno || aluno.status === "doc_aprovado") {
      await t.rollback();
      return res.status(400).json({ erro: "Aluno não encontrado ou já aprovado." });
    }

    // --- 4. LÓGICA DE TURMA (Vagas) ---
    const turmasDoCurso = await Turma.findAll({
      where: { cursoId: aluno.cursoId },
      transaction: t,
    });

    let turmaSelecionada = turmasDoCurso.find(t => t.vagas_ocupadas < t.vagas);
    if (!turmaSelecionada) {
      await t.rollback();
      return res.status(400).json({ erro: "Não há vagas disponíveis para este curso." });
    }

    // 

    // --- 5. ATUALIZAR STATUS E ROLE ---
    const usuario = await Usuario.findByPk(aluno.usuarioId, { transaction: t });
    if (usuario) {
      usuario.role = "aluno";
      await usuario.save({ transaction: t });
    }

    aluno.status = "doc_aprovado";
    aluno.turmaId = turmaSelecionada.id;
    await aluno.save({ transaction: t });

    await turmaSelecionada.increment("vagas_ocupadas", { by: 1, transaction: t });

    // --- 6. LÓGICA DE FÉRIAS NO PAGAMENTO ---
    const hoje = new Date();
    const mesAtualRaw = hoje.toLocaleString("pt-PT", { month: "long" });
    const mesFormatado = mesAtualRaw.charAt(0).toUpperCase() + mesAtualRaw.slice(1);
    
    const mesesDeFerias = ["Janeiro", "Dezembro" , "Fevereiro"];
    const eFerias = mesesDeFerias.includes(mesFormatado);

    if (!eFerias) {
      let valorCalculado = aluno.curso?.duracao_anos === 3 ? 2500.0 : 1000.0;

      await Pagamento.create(
        {
          alunoId: aluno.id,
          mes: mesFormatado,
          ano: hoje.getFullYear(),
          valor_original: valorCalculado,
          valor_atual: valorCalculado,
          status: "pendente",
          tipo_mes: "lectivo",
          data_vencimento: new Date(hoje.getFullYear(), hoje.getMonth(), 5),
          referencia: referenciaManual,
        },
        { transaction: t },
      );
    }

    await t.commit();
    res.json({
      mensagem: eFerias 
        ? "Matrícula aprovada! (Isento de propina por ser mês de férias)" 
        : "Matrícula aprovada e fatura gerada!",
      dados: { aluno: aluno.nome, turma: turmaSelecionada.nome },
    });

  } catch (err) {
    if (t) await t.rollback();
    console.error("Erro ao aprovar documento:", err);
    res.status(500).json({ erro: "Erro interno ao processar aprovação." });
  }
});

// backend/routes/matriculaRoutes.js

router.get("/turmas-alocadas", async (req, res) => {
  try {
    const turmas = await Turma.findAll({
      include: [
        {
          model: Aluno,
          as: "alunos", // Certifique-se que o alias está correto no seu Model de Turma
          where: { status: "doc_aprovado" },
          required: false, // Para mostrar a turma mesmo que ela esteja vazia
        },
      ],
      order: [["nome", "ASC"]],
    });
    res.json(turmas);
  } catch (error) {
    console.error("Erro ao buscar alunos por turma:", error);
    res.status(500).json({ erro: "Erro ao buscar alunos por turma" });
  }
});

router.get("/pesquisa-academica", auth, somenteMatricula, async (req, res) => {
  try {
    const { busca } = req.query;

    // Criamos um objeto de filtro dinâmico
    let filtroWhere = {};

    if (busca) {
      const condicoes = [{ nome: { [Op.iLike]: `%${busca}%` } }];

      // Verificamos se o que foi digitado é um formato válido de UUID
      // para evitar o erro de "operator does not exist: uuid"
      const isUUID = /^[0-9a-fA-F-]{36}$/.test(busca);

      if (isUUID) {
        condicoes.push({ id: busca });
      }

      filtroWhere = { [Op.or]: condicoes };
    }

    const alunos = await Aluno.findAll({
      where: filtroWhere,
      include: [
        { model: Curso, as: "curso" },
        { model: Turma, as: "turma" },
        {
          model: Nota,
          as: "notas",
          include: [
            { model: Disciplina, as: "disciplina" },
            { model: ConfiguracaoAvaliacao, as: "ConfiguracaoAvaliacao" },
          ],
        },
        { model: Pagamento, as: "pagamentos" },
      ],
      order: [["nome", "ASC"]],
    });

    res.json(alunos);
  } catch (error) {
    console.error("Erro na pesquisa acadêmica:", error);
    res.status(500).json({ erro: "Erro interno na busca." });
  }
});

// 1. Rota para buscar turmas disponíveis para um aluno específico
router.get("/turmas-disponiveis/:alunoId", auth, somenteMatricula, async (req, res) => {
  try {
    const { alunoId } = req.params;
    const aluno = await Aluno.findByPk(alunoId);
    
    if (!aluno) return res.status(404).json({ erro: "Aluno não encontrado" });

    // Busca turmas do MESMO curso, que NÃO sejam a atual, e que tenham VAGAS
    const turmas = await Turma.findAll({
      where: {
        cursoId: aluno.cursoId,
        id: { [Op.ne]: aluno.turmaId }, // Diferente da atual
        // Opcional: Se quiser mostrar só as que têm vaga, descomente abaixo:
        vagas_ocupadas: { [Op.lt]: sequelize.col('vagas') } 
      }
    });

    // Filtra no JS para garantir (opcional, mas seguro)
    const disponiveis = turmas.map(t => ({
      id: t.id,
      nome: t.nome,
      vagas: t.vagas,
      ocupadas: t.vagas_ocupadas,
      temVaga: t.vagas_ocupadas < t.vagas
    }));

    res.json(disponiveis);
  } catch (error) {
    res.status(500).json({ erro: "Erro ao buscar turmas." });
  }
});

// 2. Rota para mover o aluno (Manual)
router.put("/remanejar-manual", auth, somenteMatricula, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { alunoId, novaTurmaId } = req.body;

    const aluno = await Aluno.findByPk(alunoId, { transaction: t });
    const novaTurma = await Turma.findByPk(novaTurmaId, { transaction: t });
    const turmaAntigaId = aluno.turmaId;

    if (!novaTurma) throw new Error("Turma destino não encontrada.");
    
    // Verifica vaga
    if (novaTurma.vagas_ocupadas >= novaTurma.vagas) {
      throw new Error("A turma selecionada não tem vagas disponíveis.");
    }

    // Decrementa antiga
    if (turmaAntigaId) {
      await Turma.decrement('vagas_ocupadas', { by: 1, where: { id: turmaAntigaId }, transaction: t });
    }

    // Incrementa nova
    await novaTurma.increment('vagas_ocupadas', { by: 1, transaction: t });

    // Atualiza Aluno
    aluno.turmaId = novaTurma.id;
    await aluno.save({ transaction: t });

    await t.commit();
    res.json({ mensagem: "Aluno movido com sucesso!" });

  } catch (error) {
    if (t) await t.rollback();
    res.status(400).json({ erro: error.message || "Erro ao mover aluno." });
  }
});

module.exports = router;
