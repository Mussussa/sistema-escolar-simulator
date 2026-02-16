// backend/controllers/matriculaController.js

const supabase = require("../config/supabase");

const {
  Aluno,
  Usuario,
  Curso,
  Nota,
  Pagamento,
  Disciplina,
  ConfiguracaoAvaliacao,
    Presenca, // Para calcular faltas
  sequelize,
} = require("../models");
const { Op } = require("sequelize");
const bcrypt = require("bcryptjs");
const Joi = require("joi");

exports.inscreverCandidato = async (req, res) => {
  // --- CAMADA DE VALIDAÇÃO (JOI) ---
  const schema = Joi.object({
    nome: Joi.string().min(3).max(100).required(),
    username: Joi.string().alphanum().min(3).max(30).required(),
    senha: Joi.string().min(6).required(),
    email: Joi.string().email().required(), // Joi valida o formato
    ultima_classe: Joi.string().max(20).required(),
    telefone_emergencia: Joi.string().pattern(/^[0-9+ ]+$/).required(),
    contato_nome: Joi.string().max(25).required(),
    tipo_sanguineo: Joi.string().valid("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-").optional(),
    cursoId: Joi.string().guid({ version: "uuidv4" }).allow("", null),
    alergias: Joi.string().max(500).allow("", null),
    contacto: Joi.string().pattern(/^[0-9+ ]+$/).required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ erro: error.details[0].message });

  const t = await sequelize.transaction();

  try {
    const {
      nome, username, senha, email, ultima_classe,
      telefone_emergencia, contato_nome, tipo_sanguineo,
      cursoId, alergias, contacto,
    } = value;

    // --- 1. VERIFICAÇÕES DE DUPLICIDADE ---
    
    // A. Verifica Username
    const usuarioExistente = await Usuario.findOne({ where: { username } });
    if (usuarioExistente) {
      await t.rollback(); // Cancela tudo se falhar
      return res.status(400).json({ erro: "Este nome de usuário já está em uso." });
    }

    // B. Verifica Email (NOVO TRECHO IMPORTANTE) ⬇️
    const emailExistente = await Usuario.findOne({ where: { email } });
    if (emailExistente) {
      await t.rollback();
      return res.status(400).json({ erro: "Este e-mail já está cadastrado no sistema." });
    }

    // ... Se passou daqui, pode criar ...

    // 2. Hash da Senha (Segurança)
    // O seu model já tem o hook 'beforeCreate', então não precisa fazer manual aqui se o hook estiver ativo.
    // Se o hook não estiver ativo, descomente o bcrypt abaixo.
    
    const novoUsuario = await Usuario.create(
      {
        username,
        email,
        senha: senha, // O hook do model vai criptografar
        role: "pendente",
        deve_alterar_senha: false,
      },
      { transaction: t }
    );

    // 3. UPLOAD SUPABASE (Mantido igual)
    let documentoUrlFinal = null;
    if (req.file) {
      const file = req.file;
      const nomeFormatado = String(nome)
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-").toLowerCase();
      const dataAtual = new Date().toISOString().split("T")[0];
      const sufixo = Math.round(Math.random() * 1e4);
      const extensao = file.originalname.split(".").pop();
      const fileName = `matriculas/matricula-${nomeFormatado}-${dataAtual}-${sufixo}.${extensao}`;

      const { data, error: uploadError } = await supabase.storage
        .from("documentos")
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from("documentos")
        .getPublicUrl(fileName);

      documentoUrlFinal = publicData.publicUrl;
    }

    // 4. CRIAR ALUNO
    const novoAluno = await Aluno.create(
      {
        nome,
        ultima_classe,
        telefone_emergencia,
        contato_nome,
        tipo_sanguineo,
        cursoId: cursoId.trim(), // Como o Joi obriga, aqui é seguro
        usuarioId: novoUsuario.id,
        documento_url: documentoUrlFinal,
        status: "pendente",
        pago: false,
        alergias,
        contacto,
      },
      { transaction: t }
    );

    await t.commit(); // Confirma a gravação no banco
    
    res.status(201).json({
      mensagem: "Inscrição realizada com sucesso!",
      alunoId: novoAluno.id,
    });

  } catch (error) {
    if (t && !t.finished) await t.rollback();
    console.error("Erro crítico na matrícula:", error);
    
    // Dica extra: Logar erro específico para debug
    res.status(500).json({ erro: "Falha ao processar matrícula no servidor." });
  }
};

exports.obterCursos = async (req, res) => {
  try {
    // Busca todos os cursos cadastrados no banco
    const cursos = await Curso.findAll({
      // Adicionamos 'regime' aos atributos retornados
      attributes: ["id", "nome", "regime"],
      order: [["nome", "ASC"]],
    });

    // Se não houver cursos, retorna array vazio (Status 200 é melhor que 404 aqui)
    if (!cursos) {
      return res.json([]);
    }

    res.json(cursos);
  } catch (e) {
    console.error("Erro ao buscar cursos:", e);
    res.status(500).json({ erro: "Erro interno ao buscar cursos." });
  }
};



exports.rejeitarMatricula = async (req, res) => {
  try {
    // --- ADIÇÃO DO JOI ---
    const paramsSchema = Joi.object({
      alunoId: Joi.string().uuid().required().messages({
        "string.guid": "O identificador do candidato é inválido.",
        "any.required": "O ID do candidato é obrigatório."
      })
    });

    const bodySchema = Joi.object({
      motivo: Joi.string().trim().min(5).required().messages({
        "string.empty": "É obrigatório informar o motivo da rejeição.",
        "string.min": "O motivo deve ser mais detalhado (mínimo 5 caracteres).",
        "any.required": "O motivo da rejeição é obrigatório."
      })
    });

    // Validar Parâmetros (URL)
    const { error: errParam } = paramsSchema.validate(req.params);
    if (errParam) return res.status(400).json({ erro: errParam.details[0].message });

    // Validar Corpo (Body)
    const { error: errBody, value: bodyValue } = bodySchema.validate(req.body);
    if (errBody) return res.status(400).json({ erro: errBody.details[0].message });
    // ----------------------

    const { alunoId } = req.params;
    const { motivo } = bodyValue; // Usando o valor limpo pelo Joi

    const aluno = await Aluno.findByPk(alunoId);

    if (!aluno) {
      return res.status(404).json({ erro: "Candidato não encontrado." });
    }

    // Atualiza o status e salva o motivo
    aluno.status = "rejeitado";
    aluno.motivo_rejeicao = motivo;

    await aluno.save();

    res.json({
      mensagem: "Candidato rejeitado. O motivo ficará visível para ele.",
    });
  } catch (error) {
    console.error("Erro ao rejeitar:", error);
    res.status(500).json({ erro: "Erro ao processar rejeição." });
  }
};

exports.buscaGlobal = async (req, res) => {
  try {
    const { q, cursoId } = req.query;
// Certifique-se de importar o Op

    let whereAluno = {};
    if (q) {
      // Proteção para UUID se o usuário colar o ID na busca
      const isUUID = /^[0-9a-fA-F-]{36}$/.test(q);
      whereAluno = isUUID ? { id: q } : { nome: { [Op.iLike]: `%${q}%` } };
    }
    if (cursoId) whereAluno.cursoId = cursoId;

    const alunos = await Aluno.findAll({
      where: whereAluno,
      include: [
        {
          model: Usuario,
          as: "usuario",
          attributes: ["role"],
          where: { role: "aluno" },
        },
        { model: Curso, as: "curso", attributes: ["nome"] },
        {
          model: Pagamento,
          as: "pagamentos",
          attributes: ["mes", "ano", "status", "valor_atual"],
        },
        // 1. Buscamos as Notas
        {
          model: Nota,
          as: "notas",
          include: [
            {
              model: Disciplina,
              as: "disciplina",
              attributes: ["id", "nome", "aulas_planejadas"],
            },
            {
              model: ConfiguracaoAvaliacao,
              as: "ConfiguracaoAvaliacao",
              attributes: ["peso", "nome"],
            },
          ],
        },
        // 2. NOVA INCLUSÃO: Buscamos as Presenças para calcular reprovação por faltas
        {
          model: Presenca,
          as: "presencas",
          required: false, // Traz o aluno mesmo sem presenças registradas
          include: [
            {
              model: Disciplina,
              as: "disciplina",
              attributes: ["id", "aulas_planejadas"],
            },
          ],
        },
      ],
      order: [["nome", "ASC"]],
    });

    const relatorio = alunos.map((aluno) => {
      // --- A. Lógica Financeira ---
      const totalPendentes = aluno.pagamentos.filter(
        (p) => p.status !== "pago"
      ).length;

      // --- B. Mapa de Presenças (Calcula faltas por disciplina) ---
      const presencaMap = {};
      if (aluno.presencas) {
        aluno.presencas.forEach((p) => {
          const dId = p.disciplinaId;
          if (!presencaMap[dId]) {
            // Se não tiver aulas definidas, usa 30 como padrão
            const total = p.disciplina?.aulas_planejadas || 30;
            presencaMap[dId] = { faltas: 0, totalAulas: total };
          }
          // Conta apenas faltas injustificadas ("F") para penalizar
          if (p.status === "F") {
            presencaMap[dId].faltas += 1;
          }
        });
      }

      // --- C. Mapa de Notas (Agrupa e calcula média) ---
      const disciplinasMap = {};

      if (aluno.notas) {
        aluno.notas.forEach((n) => {
          if (!n.disciplina) return;
          const dId = n.disciplina.id;

          if (!disciplinasMap[dId]) {
            disciplinasMap[dId] = {
              id: dId,
              nome: n.disciplina.nome,
              somaPonderada: 0,
              notasLançadas: [],
            };
          }

          const valor = parseFloat(n.valor) || 0;
          const peso = parseFloat(n.ConfiguracaoAvaliacao?.peso) || 0;
          const nomeAv = n.ConfiguracaoAvaliacao?.nome || "Av";

          // Acumula média ponderada
          disciplinasMap[dId].somaPonderada += valor * (peso / 100);
          
          disciplinasMap[dId].notasLançadas.push({
            nome: nomeAv,
            valor: valor.toFixed(0),
            peso: peso,
          });
        });
      }

      // --- D. Formatar o histórico final (Cruzando Nota + Presença) ---
      const desempenhoAcademico = Object.values(disciplinasMap).map((disp) => {
        // 1. Média Final
        const mf = disp.somaPonderada;

        // 2. Percentagem de Presença
        const dadosP = presencaMap[disp.id] || { faltas: 0, totalAulas: 30 };
        const calcPresenca = ((dadosP.totalAulas - dadosP.faltas) / dadosP.totalAulas) * 100;
        const percPresenca = Math.max(0, calcPresenca); // Evita negativo

        // 3. Regra de Situação (Vocacional)
        let situacao = "";
        let cor = "";

        if (percPresenca < 50) {
          situacao = "Reprovado (Faltas)";
          cor = "red";
        } else if (mf >= 80) {
          situacao = "Alcançou";
          cor = "green";
        } else {
          situacao = "Não alcançou";
          cor = "orange"; // ou red, conforme preferência
        }

        return {
          disciplinaId: disp.id,
          disciplina: disp.nome,
          mediaFinal: mf.toFixed(0),
          notas: disp.notasLançadas, // Array de objetos { valor, peso }
          presenca: percPresenca.toFixed(0) + "%", // Para mostrar na ficha se quiseres
          situacao: situacao,
          cor: cor,
        };
      });

      return {
        id: aluno.id,
        nome: aluno.nome,
        curso: aluno.curso?.nome,
        statusFinanceiro:
          totalPendentes > 0 ? `Devedor (${totalPendentes} meses)` : "Regular",
        corFinanceira: totalPendentes > 0 ? "red" : "green",
        desempenhoAcademico, // Array pronto para o Frontend
        pagamentos: aluno.pagamentos,
      };
    });

    res.json(relatorio);
  } catch (error) {
    console.error("Erro na busca global:", error);
    res.status(500).json({ erro: "Erro ao processar relatório" });
  }
};

exports.regularizarSituacaoHistorica = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { alunoId, saldoDevedor, notasAntigas } = req.body; // notasAntigas: [{disciplinaId, media}]

    // 1. Atualizar o Aluno
    await Aluno.update(
      { saldoDevedorInicial: saldoDevedor, isAntigo: true },
      { where: { id: alunoId }, transaction: t },
    );

    // 2. Lançar Notas Históricas
    // Precisamos de uma Configuração de Avaliação do tipo "Média Final Histórica" (peso 100)
    if (notasAntigas && notasAntigas.length > 0) {
      for (const item of notasAntigas) {
        await Nota.create(
          {
            alunoId,
            disciplinaId: item.disciplinaId,
            valor: item.media,
            configuracaoAvaliacaoId: item.configId, // Uma config de peso 100%
            observacao: "Migração de Histórico Antigo",
          },
          { transaction: t },
        );
      }
    }

    await t.commit();
    res.json({ mensagem: "Situação regularizada com sucesso!" });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ erro: "Erro ao regularizar" });
  }
};

// const { Aluno, Nota, ConfiguracaoAvaliacao, sequelize } = require("../models");

exports.regularizarVeterano = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { alunoId, saldoDevedor, notasAntigas } = req.body;
    let avisos = []; // Para guardar mensagens de disciplinas ignoradas

    await Aluno.update(
      { saldoDevedorInicial: saldoDevedor, isAntigo: true },
      { where: { id: alunoId }, transaction: t },
    );

    if (notasAntigas && notasAntigas.length > 0) {
      for (const n of notasAntigas) {
        if (!n.media && n.media !== 0) continue;

        const notaExistente = await Nota.findOne({
          where: { alunoId, disciplinaId: n.disciplinaId },
          transaction: t,
        });

        if (notaExistente) {
          // Em vez de dar erro, registamos que esta foi pulada
          avisos.push(` já possui notas e não foi alterada .`);
          continue;
        }

        const [config] = await ConfiguracaoAvaliacao.findOrCreate({
          where: { peso: 100, disciplinaId: n.disciplinaId },
          defaults: {
            nome: "Média de Transição (Veterano)",
            peso: 100,
            ordem: 99,
            disciplinaId: n.disciplinaId,
          },
          transaction: t,
        });

        await Nota.create(
          {
            alunoId,
            disciplinaId: n.disciplinaId,
            valor: n.media,
            configuracaoId: config.id,
            observacao: "Migração de Histórico (Veterano)",
          },
          { transaction: t },
        );
      }
    }

    await t.commit();

    // Retorna sucesso e a lista de avisos (se houver)
    res.status(200).json({
      mensagem: "Processo concluído!",
      avisos: avisos,
    });
  } catch (error) {
    if (t) await t.rollback();
    res.status(500).json({ erro: "Erro interno: " + error.message });
  }
};

// No seu matriculaController.js

exports.getDisciplinasParaRegularizar = async (req, res) => {
  try {
    // --- ADIÇÃO DO JOI ---
    const schema = Joi.object({
      alunoId: Joi.string().uuid().required().messages({
        "string.guid": "O identificador do aluno fornecido é inválido.",
        "any.required": "O ID do aluno é obrigatório para esta consulta."
      })
    });

    const { error } = schema.validate(req.params);
    if (error) {
      return res.status(400).json({ erro: error.details[0].message });
    }
    // ----------------------

    const { alunoId } = req.params;

    // 1. Buscamos o aluno e verificamos se ele existe
    const aluno = await Aluno.findByPk(alunoId);
    if (!aluno) return res.status(404).json({ erro: "Aluno não encontrado" });

    // 2. Buscamos as disciplinas pelo cursoId do aluno
    const disciplinas = await Disciplina.findAll({
      where: { cursoId: aluno.cursoId },
      attributes: ["id", "nome" , "carga_horaria", "aulas_planejadas", "tipo", "vocacional"],
      order: [["nome", "ASC"]],
    });

    // Se o curso não tiver disciplinas
    if (!disciplinas || disciplinas.length === 0) {
      return res
        .status(404)
        .json({ erro: "Nenhuma disciplina encontrada para este curso." });
    }

    res.json(disciplinas);
  } catch (error) {
    console.error("ERRO REAL NO SEQUELIZE:", error);
    res
      .status(500)
      .json({ erro: "Erro ao buscar disciplinas no banco de dados" });
  }
};
