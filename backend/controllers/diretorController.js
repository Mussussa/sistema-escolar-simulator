const { Turma, Professor, Disciplina, Curso , Configuracao  , Horario , Usuario , Aviso , Aluno} = require('../models');
const fs = require('fs'); // Necessário para apagar o arquivo físico
const path = require('path');
const Joi = require("joi");
const sequelize = require('../config/database');
const { gerarHoraInicio } = require('../utils/calculadoraHorario');
const { Op, Sequelize } = require("sequelize");
const { createClient } = require('@supabase/supabase-js');



exports.obtercurso = async (req, res) => {
  try {
    // Busca todos os cursos cadastrados no banco
    const cursos = await Curso.findAll({
      attributes: ['id', 'nome' , 'regime'], // Retorna apenas o que é necessário
      order: [['nome', 'ASC']]    // Organiza por ordem alfabética
    });

    // Se não houver cursos, retorna array vazio para evitar erro no Frontend
    if (!cursos || cursos.length === 0) {
      return res.status(200).json([]);
    }

    res.json(cursos);
  } catch (e) {
    console.error("Erro ao buscar cursos:", e);
    res.status(400).json({ erro: e.message });
  }
};


// turmas
// Alteração na função obterturmas
exports.obterturmas = async (req, res) => {
  try {
    const turmas = await Turma.findAll({
      attributes: ['id', 'nome', 'turno', 'cursoId'],
      // ADICIONE ISTO: Incluir o Curso para saber o REGIME
      include: [
        { model: Curso, as: 'curso', attributes: ['nome', 'regime'] }
      ],
      order: [['nome', 'ASC']]
    });

    if (!turmas || turmas.length === 0) {
      return res.status(200).json([]);
    }

    res.json(turmas);
  } catch (e) {
    console.error("Erro ao buscar turmas:", e);
    res.status(400).json({ erro: e.message });
  }
};

// Buscar apenas os Professores para o Select
exports.obterProfessores = async (req, res) => {
  try {
    const professores = await Professor.findAll({
      attributes: ['id', 'nome' , 'email'], // Envia apenas o UUID e o Nome
      order: [['nome', 'ASC']]
    });
    res.json(professores);
  } catch (e) {
    res.status(500).json({ erro: "Erro ao carregar professores: " + e.message });
  }
};



// ja ser consumido no frontend (post)
// 2. Registar Professor

// Configuração do Supabase (A mesma que usaste no outro arquivo)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY; // Use a Key correta
const supabase = createClient(supabaseUrl, supabaseKey);


exports.registarProfessor = async (req, res) => {
  // 1. Definição do Schema de Validação
  const schema = Joi.object({
    nome: Joi.string().min(3).trim().required(),
    email: Joi.string().email().lowercase().required(),
    telefone: Joi.string().min(9).max(15).required(),
    especialidade: Joi.string().required(),
    nivel_academico: Joi.string().required()
  });

  // 2. Validação
  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ erro: error.details[0].message });
  }

  // 3. Verificar arquivo
  if (!req.file) {
    return res.status(400).json({ erro: "O arquivo BI é obrigatório." });
  }

  const t = await sequelize.transaction(); 
  
  try {
    const { nome, email, telefone, especialidade, nivel_academico } = value;

    // 4. Verificar duplicidade (E-mail)
    const professorExistente = await Professor.findOne({ where: { email } });
    if (professorExistente) {
      await t.rollback();
      return res.status(400).json({ erro: "Este e-mail já está cadastrado." });
    }

    // --- NOVA LÓGICA: UPLOAD PARA O SUPABASE ---
    const file = req.file;
    // Cria um nome único para o arquivo
    const nomeLimpo = nome.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const timestamp = Date.now();
    const extensao = file.originalname.split('.').pop();
    // Ex: professores/bi-joao-123456789.pdf
    const pathSupabase = `professores/bi-${nomeLimpo}-${timestamp}.${extensao}`;

    // A. Enviar o Buffer para o Supabase
    const { error: uploadError } = await supabase.storage
      .from("documentos") // Certifica-te que o bucket 'documentos' existe
      .upload(pathSupabase, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      throw new Error("Erro ao fazer upload do BI no Supabase: " + uploadError.message);
    }

    // B. Obter a URL Pública
    const { data: publicData } = supabase.storage
      .from("documentos")
      .getPublicUrl(pathSupabase);

    const biUrl = publicData.publicUrl;
    // -------------------------------------------

    // 5. Gerar Login
    const senhaPadrao = "teacher_2026";
    const usernameGerado = `${nome.split(' ')[0].toLowerCase()}${telefone.slice(-4)}`;

    // 6. Criar Professor (USANDO A URL DO SUPABASE AGORA)
    const novoProfessor = await Professor.create({
      nome,
      email,
      telefone,
      especialidade,
      nivel_academico,
      bi: biUrl, // <--- AQUI: Salvamos o Link do Supabase, não o filename
    }, { transaction: t });

    // 7. Criar Usuário
    await Usuario.create({
      username: usernameGerado,
      email,
      senha: senhaPadrao,
      role: 'professor',
      professorId: novoProfessor.id,
      deve_alterar_senha: true 
    }, { transaction: t });

    await t.commit();

    res.status(201).json({ 
      mensagem: "Professor registado com sucesso!", 
      acesso: {
        usuario: usernameGerado,
        senha_temporaria: senhaPadrao
      }
    });

  } catch (e) { 
    if (t) await t.rollback();
    console.error("Erro ao registrar professor:", e);
    
    if (e.name === 'SequelizeUniqueConstraintError') {
       return res.status(400).json({ erro: "E-mail, Telefone ou Username já em uso." });
    }

    res.status(500).json({ erro: "Erro interno ao processar cadastro: " + e.message });
  }
};

// 3. Criar Turma
exports.criarTurma = async (req, res) => {
  try {
    // Importante: cursoId aqui DEVE ser o UUID que veio do banco quando criaste o curso
    const { nome, cursoId, turno, ano_lectivo, professorId } = req.body;
    
    const turma = await Turma.create({ 
      nome, 
      cursoId, // Referência UUID para Curso
      professorId, // Referência UUID para Professor (Diretor de Turma)
      turno, 
      ano_lectivo 
    });
    
    res.status(201).json(turma);
  } catch (e) { 
    res.status(400).json({ erro: e.message }); 
  }
};



exports.deletarProfessor = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Buscar o professor para saber o nome do arquivo PDF (campo bi)
    const professor = await Professor.findByPk(id);

    if (!professor) {
      return res.status(404).json({ erro: "Professor não encontrado." });
    }

    // 2. Apagar o arquivo PDF da pasta se ele existir
    if (professor.bi) {
      const caminhoArquivo = path.join(__dirname, '..', 'uploads', 'professor', professor.bi);
      if (fs.existsSync(caminhoArquivo)) {
        fs.unlinkSync(caminhoArquivo); // Remove o arquivo físico
      }
    }

    // 3. Deletar do Banco de Dados
    await professor.destroy();

    res.json({ mensagem: `Professor ${professor.nome} removido com sucesso!` });
  } catch (e) {
    res.status(400).json({ erro: "Erro ao deletar: " + e.message });
  }
};

// Dentro do useEffect, a chamada deve ser assim:
exports.buscarDisciplinas = async (req, res) => {
  try {
    const { cursoId } = req.query;

    let filtro = {};
    
    // Verifica se cursoId existe e se não é a string "undefined" ou "null"
    if (cursoId && cursoId !== 'undefined' && cursoId !== 'null') {
      filtro = { where: { cursoId } };
    }

    console.log(cursoId)

    const disciplinas = await Disciplina.findAll({
      ...filtro,
      order: [['nome', 'ASC']]
    });

    res.json(disciplinas);
  } catch (e) {
    console.error("Erro ao buscar disciplinas:", e);
    res.status(500).json({ erro: "Erro interno ao buscar disciplinas" });
  }
};







exports.salvarDisciplinas = async (req, res) => {
  // 1. Definição do Schema de Validação
  const schema = Joi.object({
    cursoId: Joi.string().uuid().messages({
      "string.guid": "ID do curso inválido.",
      
    }),
    disciplinas: Joi.array().items(
      Joi.object({
        id: Joi.string().uuid().allow(null, ""), // UUID opcional para novas disciplinas
        nome: Joi.string().trim().required().messages({
          "any.required": "O nome da disciplina é obrigatório."
        }),
        carga_horaria: Joi.number().integer().min(1).default(1),
        aulas_planejadas: Joi.number().integer().min(1).default(30),
        tipo: Joi.string().valid("Geral", "Técnica", "Prática").default("Geral"),
        vocacional: Joi.string().valid("3", "4", "5").required().messages({
          "any.only": "O nível vocacional deve ser 3, 4 ou 5.",
          "any.required": "O nível vocacional é obrigatório."
        }),
        configuracaoId: Joi.string().uuid().allow(null, "").optional()
      })
    ).required()
  });

  // 2. Executar Validação
  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ erro: error.details[0].message });
  }

  const { cursoId, disciplinas: disciplinasRecebidas } = value;
  const t = await sequelize.transaction();

  try {
    const idsProcessados = [];

    // 

    for (const dispData of disciplinasRecebidas) {
      let disciplina;

      // 3. Tentar encontrar por ID (Sincronização)
      if (dispData.id) {
        disciplina = await Disciplina.findByPk(dispData.id, { transaction: t });
      }

      if (disciplina) {
        // Atualizar existente
        await disciplina.update({ ...dispData, cursoId }, { transaction: t });
      } else {
        // Criar nova ou buscar por Nome + Curso + Vocacional (Evita duplicados nominais)
        const [novaDisciplina] = await Disciplina.findOrCreate({
          where: { 
            nome: dispData.nome, 
            cursoId: cursoId,
            vocacional: dispData.vocacional
          },
          defaults: { 
            ...dispData,
            id: undefined, // Deixa o UUID ser gerado pelo banco
            cursoId 
          },
          transaction: t,
        });
        disciplina = novaDisciplina;
      }
      
      idsProcessados.push(disciplina.id);
    }

    // 4. ELIMINAÇÃO: Remove disciplinas do curso que não vieram na lista do Frontend
    // Isso garante que a grade curricular no banco seja idêntica à do Frontend
    await Disciplina.destroy({
      where: {
        cursoId: cursoId,
        id: { [Op.notIn]: idsProcessados }
      },
      transaction: t
    });

    await t.commit();

    // 5. Retornar lista limpa e ordenada
    const listaNova = await Disciplina.findAll({ 
      where: { cursoId }, 
      order: [['vocacional', 'ASC'], ['nome', 'ASC']] 
    });

    return res.json({
      mensagem: "Grade curricular atualizada com sucesso!",
      disciplinas: listaNova
    });

  } catch (err) {
    if (t) await t.rollback();
    console.error("Erro ao salvar disciplinas:", err);
    res.status(500).json({ erro: "Erro interno ao processar a grade curricular." });
  }
};


//Horario



// Retorna o horário completo de uma turma
exports.obterHorarioTurma = async (req, res) => {
  try {
    const horarios = await Horario.findAll({
      where: { turmaId: req.params.turmaId },
      include: [
        { model: Professor, as: 'professor', attributes: ['nome'] },
        { model: Disciplina, as: 'disciplina', attributes: ['nome', 'carga_horaria'] }
      ],
      order: [['dia_semana', 'ASC'], ['ordem_tempo', 'ASC']]
    });
    res.json(horarios);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
};

// Salva ou atualiza um tempoe("joi");

exports.salvarHorario = async (req, res) => {
  try {
    // 1. Definição do Schema de Validação
// 1. Definição do Schema de Validação
    const schema = Joi.object({
      turmaId: Joi.string().uuid().required().messages({
        "string.guid": "ID da turma inválido.",
        "any.required": "A turma é obrigatória."
      }),
      // CORREÇÃO AQUI: .empty('') converte string vazia para undefined, e default(null) põe null
      professorId: Joi.string().uuid().empty('').allow(null).default(null),
      disciplinaId: Joi.string().uuid().empty('').allow(null).default(null),
      
      dia_semana: Joi.string().valid(
        'Segunda-feira', 'Terça-feira', 'Quarta-feira', 
        'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'
      ).required(),
      ordem_tempo: Joi.number().integer().min(1).max(10).required(),
      periodo: Joi.string().valid("Manhã", "Tarde", "Noite").required()
    });

    // 2. Validar req.body
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ erro: error.details[0].message });
    }

    const { turmaId, professorId, dia_semana, ordem_tempo, periodo, disciplinaId } = value;

    // 3. CALCULA A HORA AUTOMATICAMENTE
    // Assumindo que a função gerarHoraInicio está disponível no escopo
    const hora_inicio = gerarHoraInicio(periodo, ordem_tempo);

    // 4. VALIDAÇÃO DE CONFLITO: Professor em duas turmas ao mesmo tempo?
    if (professorId) {
      const conflitoProfessor = await Horario.findOne({
        where: {
          professorId,
          dia_semana,
          ordem_tempo,
          periodo
        },
        include: [{ model: Turma, as: 'turma' }]
      });

      if (conflitoProfessor && conflitoProfessor.turmaId !== turmaId) {
        return res.status(400).json({ 
          erro: `Conflito: O professor já tem aula na turma ${conflitoProfessor.turma.nome} neste horário.` 
        });
      }
    }

    // 

    // 5. UPSERT (Cria ou Atualiza o slot)
    const [horario, criado] = await Horario.findOrCreate({
      where: { turmaId, dia_semana, ordem_tempo, periodo },
      defaults: { 
        ...value, 
        hora_inicio 
      }
    });

    if (!criado) {
      await horario.update({ 
        ...value, 
        hora_inicio 
      });
    }

    // 6. RETORNO OTIMIZADO (Com nomes para o Frontend)
    const horarioCompleto = await Horario.findByPk(horario.id, {
      include: [
        { model: Professor, as: 'professor', attributes: ['nome'] },
        { model: Disciplina, as: 'disciplina', attributes: ['nome'] }
      ]
    });

    res.json({ 
      mensagem: "Horário salvo com sucesso!", 
      horario: horarioCompleto 
    });

  } catch (e) {
    console.error("Erro ao salvar horário:", e);
    res.status(500).json({ erro: "Erro interno ao processar horário: " + e.message });
  }
};

// Retorna todas as disciplinas
exports.obterdisciplinas  = async (req, res) => {
  try {
    // Busca todos os cursos cadastrados no banco
    const disciplinas = await Disciplina.findAll({
      attributes: ['id', 'nome'], // Retorna apenas o que é necessário
      order: [['nome', 'ASC']]    // Organiza por ordem alfabética
    });

    // Se não houver disciplinas, retorna array vazio para evitar erro no Frontend
    if (!disciplinas || disciplinas.length === 0) {
      return res.status(200).json([]);
    }

    res.json(disciplinas);
  } catch (e) {
    console.error("Erro ao buscar disciplinas:", e);
    res.status(400).json({ erro: e.message });
  }
};


// Backend: controller.js (ou similar)

exports.obterDisciplinasPorCurso = async (req, res) => {
  try {
    const { cursoId } = req.query; // Recebe o ID do curso via Query String

    const whereCondition = cursoId ? { cursoId } : {};

    const disciplinas = await Disciplina.findAll({
      where: whereCondition,
      attributes: ['id', 'nome', 'carga_horaria'], // Importante trazer a carga horária
      order: [['nome', 'ASC']]
    });

    res.json(disciplinas);
  } catch (e) {
    console.error("Erro ao buscar disciplinas:", e);
    res.status(500).json({ erro: e.message });
  }
};




// Usuario pentente => professorRoutes



// 1. Listar usuários que se cadastraram e estão sem cargo
exports.listarPendentes = async (req, res) => {
  try {
    const pendentes = await Usuario.findAll({ where: { role: 'pendente' } });
    res.json(pendentes);
  } catch (error) {
    //console.error("Erro ao buscar usuários pendentes:", error);
    res.status(500).json({ erro: "Erro ao buscar pendentes" });
  }
};

// 2. Aprovar usuário como Professor
exports.aprovarComoProfessor = async (req, res) => {
  try {
    const { usuarioId, professorId } = req.body; 
    // usuarioId: ID do usuário 'pendente'
    // professorId: ID do cadastro de professor que o diretor já fez anteriormente

    await Usuario.update(
      { role: 'professor', professorId: professorId },
      { where: { id: usuarioId } }
    );

    res.json({ mensagem: "Usuário agora é um Professor oficial!" });
  } catch (error) {
    res.status(500).json({ erro: "Erro ao vincular professor" });
  }
};


// Postar novo aviso
exports.criarAviso = async (req, res) => {
  try {
    const { titulo, conteudo, prioridade, cursoId, turmaId } = req.body;
    const novoAviso = await Aviso.create({
      titulo,
      conteudo,
      prioridade,
      cursoId: cursoId || null,
      turmaId: turmaId || null
    });
    res.status(201).json(novoAviso);
  } catch (error) {
    console.error("Erro ao postar aviso." , error)
    res.status(400).json({ erro: "Erro ao postar aviso." });
  }
};

exports.obterAviso = async (req, res) => {
  try {
    // 1. Buscar o usuário e incluir os dados do Aluno vinculado
    // Usamos o 'as: aluno' porque é como definimos na associação
    const usuario = await Usuario.findOne({ 
      where: { id: req.usuarioId },
      include: [{ 
        model: Aluno, 
        as: 'aluno',
        attributes: ['cursoId', 'turmaId'] // Só pegamos o necessário
      }]
    });

    if (!usuario) return res.status(404).json({ erro: "Usuário não encontrado." });

    // 2. Criar a lista de condições para o filtro OR
    // Começamos com avisos globais (onde curso e turma são nulos)
    let condicoes = [
      { cursoId: null, turmaId: null }
    ];

    // 3. Se o usuário for um Aluno, adicionamos os avisos específicos dele
    if (usuario.aluno) {
      if (usuario.aluno.cursoId) {
        condicoes.push({ cursoId: usuario.aluno.cursoId });
      }
      if (usuario.aluno.turmaId) {
        condicoes.push({ turmaId: usuario.aluno.turmaId });
      }
    }

    // 4. Buscar os avisos usando o operador [Op.or]
    const avisos = await Aviso.findAll({
      where: {
        [Op.or]: condicoes,
      },
      order: [["createdAt", "DESC"]],
      limit: 10,
    });

    res.json(avisos);
  } catch (error) {
    console.error("Erro ao buscar avisos:", error);
    res.status(500).json({ erro: "Erro ao carregar avisos." });
  }
};



exports.removerAviso = async (req, res) => {
  try {
    // 1. Esquema de Validação para Parâmetros (req.params)
    const schema = Joi.object({
      id: Joi.string().uuid().required().messages({
        "string.guid": "O identificador do aviso é inválido.",
        "any.required": "O ID do aviso é obrigatório para a remoção."
      })
    });

    // 2. Validar req.params
    const { error, value } = schema.validate(req.params);

    if (error) {
      return res.status(400).json({ erro: error.details[0].message });
    }

    const { id } = value;

    // 3. Executar a remoção
    const deletado = await Aviso.destroy({ where: { id } });

    if (!deletado) {
      return res.status(404).json({ erro: "Aviso não encontrado ou já removido." });
    }

    res.json({ mensagem: "Aviso removido com sucesso!" });

  } catch (error) {
    console.error("Erro ao remover aviso:", error);
    res.status(500).json({ erro: "Erro interno ao tentar remover o aviso." });
  }
};