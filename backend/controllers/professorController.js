const { Horario, Turma, Aluno, Nota, Presenca, Disciplina , Usuario , ConfiguracaoAvaliacao ,Curso , Op} = require("../models");

const { calcularResultadoFinal } = require("../utils/regrasAvaliacao");
const Joi = require("joi");

// 1. Ver o horário do próprio professor
// professorController.js
exports.getMeusHorarios = async (req, res) => {
  try {
    const { professorId } = req.params;
    const horarios = await Horario.findAll({
      where: { professorId },
      include: [
        { 
          model: Turma, 
          as: 'turma', 
          attributes: ['nome', 'id', 'turno', 'cursoId'],
          include: [{ model: Curso, as: 'curso', attributes: ['regime'] }]
        },
        { model: Disciplina, as: 'disciplina', attributes: ['nome', 'id'] }
      ],
      order: [['dia_semana', 'ASC'], ['ordem_tempo', 'ASC']]
    });
    res.json(horarios);
  } catch (e) {
    // IMPORTANTE: Logar o erro no console do Render para você ver o nome da coluna faltante
    console.error("ERRO SQL HORARIOS:", e); 
    res.status(400).json({ 
      erro: "Falha na consulta ao banco", 
      mensagem_real: e.message,
      sql_error: e.parent?.message // Isso mostra o erro direto do Postgres
    });
  }
};

// 2. Listar alunos de uma turma específica para lançar notas/faltas
exports.getAlunosPorTurma = async (req, res) => {
  try {
    const { turmaId } = req.params;
    const alunos = await Aluno.findAll({
      where: { turmaId },
      // Definimos apenas os campos que o frontend REALMENTE precisa
      attributes: [
        'id', 
        'nome', 
        'status', 
        'progresso', 
        'pago', 
        'numero_chamada'
      ],
      order: [['nome', 'ASC']]
    });
    
    res.json(alunos);
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
};

exports.salvarNotas = async (req, res) => {
  try {
    const { notas } = req.body; 

    if (!Array.isArray(notas)) {
      return res.status(400).json({ erro: "Formato de dados inválido." });
    }

    const promessas = notas.map(nota => {
      // TRAVA DE SEGURANÇA: Garante que o valor esteja entre 0 e 100
      // Math.max(0, ...) garante que não seja negativo
      // Math.min(..., 100) garante que não passe de 100
      const valorProtegido = Math.min(Math.max(parseFloat(nota.valor) || 0, 0), 100);

      return Nota.upsert({
        alunoId: nota.alunoId,
        disciplinaId: nota.disciplinaId,
        configuracaoId: nota.configuracaoId,
        valor: valorProtegido, // Salva o valor já validado
        tipo: nota.tipo || "TESTE"
      });
    });

    await Promise.all(promessas);

    res.json({ mensagem: "Notas sincronizadas com sucesso!" });
  } catch (e) {
    console.error("Erro ao salvar notas:", e);
    // Se o erro for o de Unique Constraint que vimos antes, mandamos uma mensagem amigável
    if (e.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ erro: "Já existe uma nota registrada para este aluno nesta avaliação." });
    }
    res.status(500).json({ erro: "Erro interno ao salvar notas." });
  }
};


const XLSX = require("xlsx");

// --- REGISTO DE PRESENÇAS MANUAIS ---
// professorController.js -> Verifique se está assim:


exports.salvarPresencas = async (req, res) => {
  try {
    // 1. Definição do Schema para CADA item do array
    const itemPresencaSchema = Joi.object({
      alunoId: Joi.string().uuid().required().messages({
        "string.guid": "ID do aluno inválido.",
        "any.required": "O ID do aluno é obrigatório."
      }),
      disciplinaId: Joi.string().uuid().required().messages({
        "string.guid": "ID da disciplina inválido.",
        "any.required": "A disciplina é obrigatória."
      }),
      horarioId: Joi.string().uuid().required().messages({
        "string.guid": "ID do horário inválido.",
        "any.required": "O horário é obrigatório."
      }),
      usuarioId: Joi.string().uuid().required(), // Professor que está fazendo a chamada
      data: Joi.date().iso().required().messages({
        "date.format": "Formato de data inválido.",
        "any.required": "A data é obrigatória."
      }),
      status: Joi.string().valid("P", "F").required().messages({
        "any.only": "O status deve ser 'P' (Presença) ou 'F' (Falta).",
        "any.required": "O status da presença é obrigatório."
      }),
      justificativa: Joi.string().allow(null, "").max(255).messages({
        "string.max": "A justificativa não pode exceder 255 caracteres."
      })
    });

    // 2. Schema para o Body (Array de objetos)
    const schema = Joi.object({
      presencas: Joi.array().items(itemPresencaSchema).min(1).required().messages({
        "array.min": "É necessário enviar pelo menos uma presença.",
        "any.required": "A lista de presenças é obrigatória."
      })
    });

    // 3. Executar Validação
    const { error, value } = schema.validate(req.body);

    if (error) {
      return res.status(400).json({ erro: error.details[0].message });
    }

    const { presencas } = value;

    

    // 4. Salvar ou Atualizar em massa
    // O Joi garante que a estrutura de 'presencas' está 100% correta aqui
    await Presenca.bulkCreate(presencas, { 
      updateOnDuplicate: ["status", "justificativa"] 
    });
    
    res.json({ mensagem: "Chamada salva com sucesso!" });
  } catch (e) {
    console.error("Erro ao salvar presenças:", e);
    res.status(500).json({ erro: "Erro interno ao processar a folha de presenças." });
  }
};


exports.justificarFalta = async (req, res) => {
  try {
    // Pegamos os campos que identificam a falta de forma única
    const { alunoId, disciplinaId, data, justificativa, motivo } = req.body;
    const textoJustificativa = justificativa || motivo;

    if (!alunoId || !disciplinaId || !data || !textoJustificativa) {
      return res.status(400).json({ 
        erro: "Aluno, Disciplina, Data e Justificativa são obrigatórios." 
      });
    }

    // Atualizamos diretamente o registro que bate com esses 3 critérios
    const [rowsUpdated] = await Presenca.update(
      { 
        status: 'FJ', 
        justificativa: textoJustificativa 
      },
      {
        where: {
          alunoId,
          disciplinaId,
          data,
          status: 'F' // Garantimos que estamos justificando algo que era falta
        }
      }
    );

    if (rowsUpdated === 0) {
      return res.status(404).json({ 
        erro: "Nenhum registro de falta encontrado para os dados informados." 
      });
    }

    res.json({ mensagem: "Falta justificada com sucesso!" });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
};


// No topo do professorController.js


exports.getFaltasDoAluno = async (req, res) => {
  try {
    const { alunoId, disciplinaId } = req.query;

    const faltas = await Presenca.findAll({
      where: {
        alunoId: alunoId,
        disciplinaId: disciplinaId,
        status: 'F' 
      },
      include: [{ model: Aluno, attributes: ['nome'] }], // Opcional: traz o nome do aluno junto
      order: [['data', 'DESC']]
    });

    res.json(faltas);
  } catch (e) {
    res.status(400).json({ erro: "Erro ao buscar histórico: " + e.message });
  }
};




exports.getFaltasPorData = async (req, res) => {
  try {
    const { disciplinaId, data } = req.query; // Remova turmaId daqui

    if (!disciplinaId || !data) {
      return res.status(400).json({ erro: "disciplinaId e data são obrigatórios." });
    }

    const filtro = {
      disciplinaId,
      status: 'F',
      data: data
    };

    // Filtro apenas por aluno (se houver), NUNCA por turmaId
    const { alunoId } = req.query;
    if (alunoId) {
      filtro.alunoId = alunoId;
    }

    const faltas = await Presenca.findAll({
      where: filtro,
      include: [{ model: Aluno, as: 'aluno', attributes: ['nome'] }], 
      order: [['data', 'DESC']]
    });

    res.json(faltas);
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
};



// --- GERAR MODELO DE EXCEL PARA O PROFESSOR ---
exports.gerarModeloFaltas = async (req, res) => {
  try {
    const { turmaId, disciplinaId } = req.params;
    
    const alunos = await Aluno.findAll({
      where: { turmaId },
      order: [['nome', 'ASC']],
      attributes: ['id', 'nome', 'numero_chamada']
    });

    // Criamos os dados para a planilha
    const dados = alunos.map(a => ({
      "ID (Não mexer)": a.id,
      "Nº": a.numero_chamada,
      "Nome do Aluno": a.nome,
      "Presença (P ou F)": "P", // Padrão é Presente
      "Data (YYYY-MM-DD)": new Date().toISOString().split('T')[0]
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lista de Chamada");

    // Gerar buffer para envio
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    
    res.setHeader('Content-Disposition', 'attachment; filename=modelo_faltas.xlsx');
    res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

  } catch (e) {
    res.status(400).json({ erro: "Erro ao gerar modelo" });
  }
};

// --- IMPORTAR PLANILHA PREENCHIDA ---




exports.importarFaltasPlanilha = async (req, res) => {
  try {
    // 1. Validação do Body (Metadados)
    const bodySchema = Joi.object({
      disciplinaId: Joi.string().uuid().required().messages({
        "string.guid": "ID da disciplina inválido.",
        "any.required": "A disciplina é obrigatória para a importação."
      })
    });

    const { error: bodyError, value: bodyValue } = bodySchema.validate(req.body);
    if (bodyError) return res.status(400).json({ erro: bodyError.details[0].message });

    // 2. Verificação de Arquivo
    if (!req.files || !req.files.planilha) {
      return res.status(400).json({ erro: "Nenhum ficheiro Excel enviado." });
    }

    const { disciplinaId } = bodyValue;
    const arquivo = req.files.planilha;
    const workbook = XLSX.read(arquivo.data, { type: "buffer" });
    const nomeFolha = workbook.SheetNames[0];
    const dados = XLSX.utils.sheet_to_json(workbook.Sheets[nomeFolha]);

    // 3. Validação do Conteúdo da Planilha (Linha por Linha)
    const itemPlanilhaSchema = Joi.object({
      alunoId: Joi.string().uuid().required(),
      disciplinaId: Joi.string().uuid().required(),
      status: Joi.string().valid("P", "F").required(),
      data: Joi.date().iso().required()
    });

    const presencasParaSalvar = [];
    
    // Mapeamos e validamos cada linha
    for (let i = 0; i < dados.length; i++) {
      const linha = dados[i];
      const objFormatado = {
        alunoId: linha["ID (Não mexer)"],
        disciplinaId: disciplinaId,
        status: String(linha["Presença (P ou F)"] || "").toUpperCase() === "F" ? "F" : "P",
        data: linha["Data (YYYY-MM-DD)"]
      };

      // Validar a linha atual
      const { error: linhaError } = itemPlanilhaSchema.validate(objFormatado);
      if (linhaError) {
        return res.status(400).json({ 
          erro: `Erro na linha ${i + 2} do Excel: ${linhaError.details[0].message}` 
        });
      }

      presencasParaSalvar.push(objFormatado);
    }

    

    // 4. Salvar no Banco
    if (presencasParaSalvar.length > 0) {
      await Presenca.bulkCreate(presencasParaSalvar, { 
        updateOnDuplicate: ["status"] 
      });
    }

    res.json({ 
      mensagem: `Sucesso! ${presencasParaSalvar.length} registros da planilha processados.` 
    });

  } catch (e) {
    console.error("Erro na importação:", e);
    res.status(500).json({ erro: "Erro ao processar planilha: " + e.message });
  }
};

const bcrypt = require('bcryptjs'); // Caso precise comparar manualmente, mas o seu model costuma ter hooks

exports.alterarSenhaObrigatoria = async (req, res) => {
  try {
    const { novaSenha } = req.body;
    const usuarioId = req.user.id; // ID vindo do token JWT

    if (!novaSenha || novaSenha.length < 6) {
      return res.status(400).json({ erro: "A nova senha deve ter pelo menos 6 caracteres." });
    }

    // 1. Buscar o usuário
    const usuario = await Usuario.findByPk(usuarioId);

    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    // 2. Atualizar a senha e desligar a flag de obrigatoriedade
    // O seu model 'Usuario' deve ter um hook 'beforeUpdate' ou 'beforeSave' para hash da senha
    usuario.senha = novaSenha;
    usuario.deve_alterar_senha = false; 

    await usuario.save();

    res.json({ mensagem: "Senha atualizada com sucesso! Acesso liberado." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: "Erro ao atualizar a senha." });
  }
};




// avalicoes 


exports.configurarAvaliacoes = async (req, res) => {
  try {
    const { disciplinaId, testes } = req.body; 
    // testes: [{ nome: "Teste 1", peso: 30 }, { nome: "Teste 2", peso: 70 }]

    if (testes.length > 4) return res.status(400).json({ erro: "Máximo de 4 testes." });
    
    const soma = testes.reduce((acc, t) => acc + t.peso, 0);
    if (soma !== 100) return res.status(400).json({ erro: "A soma dos pesos deve ser 100%." });

    // Remove configurações antigas e cria novas (ou usa um Upsert)
    await ConfiguracaoAvaliacao.destroy({ where: { disciplinaId } });
    const configs = await ConfiguracaoAvaliacao.bulkCreate(
      testes.map(t => ({ ...t, disciplinaId }))
    );

    res.json({ mensagem: "Configuração salva!", configs });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
};



exports.obterPautaDisciplina = async (req, res) => {
  try {
    const { disciplinaId, turmaId } = req.params;

    // 1. Busca os alunos e as notas
    const alunos = await Aluno.findAll({
      where: { turmaId },
      include: [{ 
        model: Nota, 
        where: { disciplinaId },
        required: false,
        include: ['ConfiguracaoAvaliacao'] // Para saber o peso de cada nota
      }]
    });

    // 2. Mapeia os alunos aplicando o Util de regras
    const pauta = alunos.map(aluno => {
      const notasFormatadas = aluno.Notas.map(n => ({
        valor: n.valor,
        peso: n.ConfiguracaoAvaliacao.peso
      }));

      // AQUI USAMOS O UTIL
      const resultado = calcularResultadoFinal(notasFormatadas, aluno.notaExame);

      return {
        id: aluno.id,
        nome: aluno.nome,
        notas: aluno.Notas,
        ...resultado
      };
    });

    res.json(pauta);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
};


// Renomeie 'configurarAvaliacoes' para 'salvarConfiguracaoNotas'


exports.salvarConfiguracaoNotas = async (req, res) => {
  try {
    // 1. Esquema de Validação Joi
    const schema = Joi.object({
      disciplinaId: Joi.string().uuid().required().messages({
        "string.guid": "ID da disciplina inválido.",
        "any.required": "A disciplina é obrigatória."
      }),
      testes: Joi.array().items(
        Joi.object({
          nome: Joi.string().trim().required().messages({
            "any.required": "O nome da avaliação (ex: Teste 1) é obrigatório."
          }),
          peso: Joi.number().integer().min(1).max(100).required().messages({
            "number.base": "O peso deve ser um número.",
            "number.min": "O peso mínimo é 1%.",
            "any.required": "O peso é obrigatório."
          })
        })
      ).min(1).required().messages({
        "array.min": "Defina pelo menos uma avaliação para esta disciplina."
      })
    });

    // 2. Executar Validação
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ erro: error.details[0].message });
    }

    const { disciplinaId, testes } = value;

    // 3. Validação Lógica: Soma dos Pesos deve ser 100
    const soma = testes.reduce((acc, t) => acc + t.peso, 0);
    if (soma !== 100) {
      return res.status(400).json({ erro: `A soma dos pesos é ${soma}%. Deve ser exatamente 100%.` });
    }

    // 

    // 4. Resetar Configurações e Notas Relacionadas
    const configsAntigas = await ConfiguracaoAvaliacao.findAll({ where: { disciplinaId } });
    const idsAntigos = configsAntigas.map(c => c.id);
    
    // Deletar notas dependentes para evitar erro de Foreign Key
    await Nota.destroy({ where: { configuracaoId: idsAntigos } });

    // Deletar as configurações atuais
    await ConfiguracaoAvaliacao.destroy({ where: { disciplinaId } });
    
    // 5. Criar as novas configurações em massa
    const configs = await ConfiguracaoAvaliacao.bulkCreate(
      testes.map(t => ({ 
        nome: t.nome, 
        peso: t.peso, 
        disciplinaId: disciplinaId 
      }))
    );

    res.json({ mensagem: "Pesos configurados e notas resetadas com sucesso!", configs });

  } catch (e) {
    console.error("Erro ao salvar config de notas:", e);
    res.status(500).json({ erro: "Erro interno ao processar pesos das notas." });
  }
};
// Adicione esta função que está a faltar para a rota GET
exports.getConfiguracaoNotas = async (req, res) => {
  try {
    const { disciplinaId } = req.params;
    // Se o ID não vier, evitamos consultar o banco
    if (!disciplinaId || disciplinaId === 'undefined') {
      return res.status(200).json([]); 
    }
    const configs = await ConfiguracaoAvaliacao.findAll({ where: { disciplinaId } });
    res.json(configs || []);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
};

exports.getPautaCompleta = async (req, res) => {
  try {
    const { disciplinaId, turmaId } = req.params;

    const disciplina = await Disciplina.findByPk(disciplinaId);
    
    // Usamos .get({ plain: true }) ou raw: true para evitar problemas com objetos circulares do Sequelize
    const alunos = await Aluno.findAll({
      where: { turmaId },
      include: [
        { 
          model: Nota, 
          as: 'notas', 
          where: { disciplinaId }, 
          required: false 
        },
        {
          model: Presenca,
          as: 'presencas',
          where: { disciplinaId },
          required: false
        }
      ]
    });

    const pauta = alunos.map(alunoInstance => {
      // Converte a instância do Sequelize em um objeto JS puro
      const aluno = alunoInstance.get({ plain: true });
      
      const presencasDoAluno = aluno.presencas || [];
      const aulasPlanejadas = disciplina?.aulas_planejadas || 30;

      // Filtro de presenças
      const totalPresencas = presencasDoAluno.filter(p => 
        p.status === 'P' || p.status === 'FJ'
      ).length;

      return {
        id: aluno.id,
        nome: aluno.nome,
        totalPresencas,
        aulas_planejadas: aulasPlanejadas,
        percPresenca: ((totalPresencas / aulasPlanejadas) * 100).toFixed(0),
        notas: (aluno.notas || []).map(n => ({
          configuracaoId: n.configuracaoId,
          valor: parseFloat(n.valor) // Garante que o valor vá como número
        }))
      };
    });

    res.json(pauta);
  } catch (e) {
    console.error("ERRO NA PAUTA:", e);
    res.status(500).json({ erro: e.message });
  }
};


// Função para salvar notas de Exame e Recorrência
exports.salvarNotasFinais = async (req, res) => {
  try {
    const { notasFinais } = req.body; 
    // notasFinais: [{ alunoId: "...", notaExame: 12, notaRecorrencia: 10 }, ...]

    console.log("Notas Finais Recebidas:", notasFinais);

    if (!Array.isArray(notasFinais)) {
      return res.status(400).json({ erro: "Formato de dados inválido." });
    }

    // Usamos um loop de promises para atualizar cada aluno individualmente
    const updates = notasFinais.map(item => 
      Aluno.update(
        { 
          notaExame: item.notaExame, 
          notaRecorrencia: item.notaRecorrencia 
        },
        { where: { id: item.alunoId } }
      )
    );

    await Promise.all(updates);

    res.json({ mensagem: "Notas de exame/recorrência salvas com sucesso!" });
  } catch (e) {
    console.error("Erro ao salvar notas finais:", e);
    res.status(500).json({ erro: "Erro ao salvar: " + e.message });
  }
};