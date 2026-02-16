const { Pagamento, Aluno, Curso, Turma ,Sequelize } = require("../models");
const { Op } = Sequelize;
const { gerarReciboOficial } = require("../utils/geradorPdf");
// Função Interna de Auxílio: Atualiza as multas conforme o tempo de atraso
const aplicarMultasProgressivas = async () => {
  const hoje = new Date();

  // Apenas busca pagamentos de meses LECTIVOS que não estão pagos
  const pendentes = await Pagamento.findAll({
    where: {
      status: { [Op.ne]: "pago" },
      tipo_mes: "lectivo",
    },
  });

  for (const p of pendentes) {
    const vencimento = new Date(p.data_vencimento);
    const diffTime = hoje - vencimento;
    const diasAtraso = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let novoValor = parseFloat(p.valor_original);
    let novoNivel = 0;

    // Lógica: 10% após 1 dias | 25% após 14 dias
    if (diasAtraso >= 1) {
      novoValor = novoValor * 1.05;
      novoNivel = 2;
    }

    // Só atualiza se houver mudança de nível ou se o status passar de pendente para atrasado
    if (
      novoNivel !== p.nivel_multa ||
      (diasAtraso > 0 && p.status === "pendente")
    ) {
      await p.update({
        valor_atual: novoValor,
        nivel_multa: novoNivel,
        status: diasAtraso > 0 ? "atrasado" : "pendente",
      });
    }
  }
};

// 1. Obter Estatísticas
exports.obterEstatisticasPropinas = async (req, res) => {
  try {
    await aplicarMultasProgressivas();

    // 1. RECEBER OS FILTROS DO FRONTEND
    const { busca, turmaId, mes } = req.query;

    // 2. DEFINIR O MÊS (Igual à lista: usa o filtro ou o mês atual)
    const mesAtual = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date());
    // Capitaliza a primeira letra (janeiro -> Janeiro)
    const mesDefault = mesAtual.charAt(0).toUpperCase() + mesAtual.slice(1);
    const mesParaFiltrar = mes || mesDefault;

    // 3. CRIAR O FILTRO DE ALUNO (Para o Card "Matriculados" e para filtrar pagamentos por nome)
    const whereAluno = { status: "doc_aprovado" };
    
    // Se digitou nome, filtra
    if (busca) {
      whereAluno.nome = { [Op.iLike]: `%${busca}%` };
    }
    // Se selecionou turma, filtra
    if (turmaId) {
      whereAluno.turmaId = turmaId;
    }

    // 4. CONTAGEM 1: Total de Alunos (Respeitando a busca e a turma)
    const totalMatriculados = await Aluno.count({
      where: whereAluno,
    });

    // 5. CONTAGEM 2, 3 e 4: Pagamentos (Respeitando a busca, a turma E O MÊS)
    // Precisamos fazer um JOIN com a tabela de Alunos para filtrar pelo nome/turma
    const contarPagamentos = async (statusPagamento) => {
      return await Pagamento.count({
        where: { 
          status: statusPagamento,
          mes: mesParaFiltrar // Filtra apenas o mês selecionado
        },
        include: [
          {
            model: Aluno,
            as: "aluno", // Verifique se no seu model está 'aluno' ou 'Aluno'
            where: whereAluno, // AQUI ESTÁ O SEGREDO: Só conta se o aluno passar no filtro
            required: true // Inner Join (só conta pagamentos de alunos encontrados)
          }
        ]
      });
    };

    const pagaram = await contarPagamentos("pago");
    const emAtraso = await contarPagamentos("atrasado");
    const pendentes = await contarPagamentos("pendente");

    // 6. RETORNO DOS DADOS
    res.json({
      mesReferencia: mesParaFiltrar, // Útil para mostrar no frontend
      totalMatriculados,
      pagaram,
      emAtraso,
      pendentes,
      taxaPagamento:
        totalMatriculados > 0
          ? ((pagaram / totalMatriculados) * 100).toFixed(1)
          : 0,
    });

  } catch (error) {
    console.error("Erro ao obter estatísticas financeiras:", error);
    res.status(500).json({
      erro: "Erro ao carregar estatísticas financeiras.",
    });
  }
};

// Verifique se o nome está correto: listarTodasTurmas
exports.listarTodasTurmas = async (req, res) => {
  try {
    const turmas = await Turma.findAll({
      attributes: ["id", "nome", "turno"],
      order: [["nome", "ASC"]],
    });
    res.json(turmas);
  } catch (error) {
    res.status(500).json({ erro: "Erro interno" });
  }
};

// 2. Listar todos os pagamentos
// 2. Listar todos os pagamentos
// 2. Listar todos os pagamentos com Pesquisa e Filtros
exports.listarPagamentosMural = async (req, res) => {
  try {
    await aplicarMultasProgressivas();
    const { status, mes, busca, turmaId } = req.query;

    // 1. DEFINIÇÃO DO MÊS DE REFERÊNCIA
    // Se não vier mês, pegamos o mês atual em português (ex: "Janeiro")
    const mesAtual = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(
      new Date(),
    );
    const mesDefault = mesAtual.charAt(0).toUpperCase() + mesAtual.slice(1);
    const mesParaFiltrar = mes || mesDefault;

    let filtroAluno = { status: "doc_aprovado" };
    if (busca) filtroAluno.nome = { [Op.iLike]: `%${busca}%` };
    if (turmaId) filtroAluno.turmaId = turmaId;

    // 2. CONFIGURAÇÃO DO FILTRO DE PAGAMENTO
    // Agora usamos sempre um mês de referência para a lista não ficar bagunçada
    let filtroPagamento = { mes: mesParaFiltrar };

    if (status && status !== "sem_registro") {
      filtroPagamento.status = status;
    }

    // A lógica do "Pulo do Gato" continua excelente:
    // Se o user quer ver um status específico, usamos INNER JOIN (required: true)
    // Se quer ver a lista geral do mês, usamos LEFT JOIN (required: false) para achar os 'sem_registro'
    const isFiltroRigoroso = status && status !== "sem_registro";

    const alunos = await Aluno.findAll({
      where: filtroAluno,
      attributes: ["id", "nome"],
      include: [
        {
          model: Curso,
          as: "curso",
          attributes: ["nome"],
        },
        {
          model: Pagamento,
          as: "pagamentos",
          where: filtroPagamento,
          required: isFiltroRigoroso,
          limit: 1,
          order: [["createdAt", "DESC"]],
        },
      ],
      order: [["nome", "ASC"]],
    });

    // 3. FORMATAÇÃO COM MÊS DE REFERÊNCIA
    let listaFormatada = alunos.map((aluno) => {
      const ultimoPagamento = aluno.pagamentos[0] || null;

      return {
        id_aluno: aluno.id,
        nome: aluno.nome,
        curso: aluno.curso?.nome,
        pagamento: ultimoPagamento,
        mesReferencia: mesParaFiltrar, // Informamos ao front qual mês está sendo exibido
        situacao: ultimoPagamento ? ultimoPagamento.status : "sem_registro",
      };
    });

    if (status === "sem_registro") {
      listaFormatada = listaFormatada.filter(
        (item) => item.situacao === "sem_registro",
      );
    }

    res.json(listaFormatada);
  } catch (error) {
    console.error("Erro ao listar mural:", error);
    res.status(500).json({ erro: "Erro ao carregar mural financeiro." });
  }
};
// 3. Aprovar Pagamento (Manual pelo Diretor)


exports.aprovarPagamento = async (req, res) => {
  try {
    // --- ADIÇÃO DO JOI ---
    const schemaParams = Joi.object({
      id: Joi.string().uuid().required()
    });
    const schemaBody = Joi.object({
      referenciaManual: Joi.string().trim().required().messages({
        "string.empty": "É necessário inserir a referência do pagamento."
      })
    });

    const { error: errParam } = schemaParams.validate(req.params);
    if (errParam) return res.status(400).json({ erro: "ID de pagamento inválido." });

    const { error: errBody, value: bodyValue } = schemaBody.validate(req.body);
    if (errBody) return res.status(400).json({ erro: errBody.details[0].message });
    // ----------------------

    const { id } = req.params;
    const { referenciaManual } = bodyValue; 

    // 2. Busca o pagamento
    const pagamento = await Pagamento.findByPk(id, {
      include: [{ model: Aluno, as: "aluno" }],
    });

    if (!pagamento)
      return res.status(404).json({ erro: "Registro não encontrado." });
    
    if (pagamento.status === "pago")
      return res.status(400).json({ erro: "Este pagamento já foi liquidado anteriormente." });

    // 3. Verificar se ESSA referência já foi usada em outro pagamento (Unique Check)
    const refExiste = await Pagamento.findOne({ where: { referencia: referenciaManual } });
    if (refExiste) {
      return res.status(400).json({ 
        erro: "Esta referência já consta no sistema. Verifique se o talão é duplicado." 
      });
    }

    const valorFinal = pagamento.valor_atual;

    // 4. Gerar o PDF
    const urlRelativaPdf = await gerarReciboOficial(
      { 
        ...pagamento.dataValues, 
        valor_pago: valorFinal, 
        referencia: referenciaManual 
      },
      pagamento.aluno,
    );

    // 5. Atualizar o banco de dados
    await pagamento.update({
      status: "pago",
      valor_pago: valorFinal,
      data_confirmacao: new Date(),
      referencia: referenciaManual,
      talao_url: urlRelativaPdf,
    });

    res.json({
      mensagem: "Pagamento confirmado e recibo gerado!",
      recibo: urlRelativaPdf,
    });

  } catch (error) {
    console.error("Erro na aprovação:", error);
    res.status(500).json({ erro: "Falha ao processar pagamento e gerar recibo." });
  }
};

// Função para gerar fatura inicial ou mensal
// Função para gerar fatura inicial ou mensal (Versão Inteligente)


exports.gerarFaturaAluno = async (req, res) => {
  try {
    // --- ADIÇÃO DO JOI ---
    const schema = Joi.object({
      alunoId: Joi.string().uuid().required().messages({
        "any.required": "ID do aluno é obrigatório."
      })
    });

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ erro: error.details[0].message });
    // ----------------------

    const { alunoId } = value;
    const hoje = new Date();
    
    // 1. FORMATAÇÃO DO MÊS
    const mesAtualNome = hoje.toLocaleString("pt-PT", { month: "long" });
    const mesFormatado = mesAtualNome.charAt(0).toUpperCase() + mesAtualNome.slice(1);
    const anoAtual = hoje.getFullYear();

    // 2. CONFIGURAÇÃO DE FÉRIAS
    const mesesDeFerias = ["Janeiro", "Dezembro" , "Fevereiro"]; 
    const eFerias = mesesDeFerias.includes(mesFormatado);

    if (eFerias) {
      return res.status(400).json({
        erro: `Não é possível gerar fatura para ${mesFormatado}.`,
        mensagem: "Este mês está configurado como período de férias (sem cobranças)."
      });
    }

    // 3. VERIFICAR DUPLICADOS
    const existe = await Pagamento.findOne({
      where: { alunoId, mes: mesFormatado, ano: anoAtual },
    });

    if (existe)
      return res.status(400).json({
        erro: `Fatura de ${mesFormatado} já existe para este aluno.`,
      });

    // 4. BUSCAR DADOS DO ALUNO E CURSO
    const alunoComCurso = await Aluno.findByPk(alunoId, {
      include: [{ model: Curso, as: "curso", attributes: ["duracao_anos"] }],
    });

    if (!alunoComCurso?.curso) {
      return res.status(400).json({ erro: "Aluno sem curso vinculado." });
    }

    // 5. DEFINIR VALOR
    let valor_original = alunoComCurso.curso.duracao_anos === 3 ? 2500.0 : 1000.0;

    // 6. CRIAR O REGISTO
    const novoPagamento = await Pagamento.create({
      alunoId,
      mes: mesFormatado,
      ano: anoAtual,
      valor_original: valor_original,
      valor_atual: valor_original,
      status: "pendente",
      tipo_mes: "lectivo", 
      data_vencimento: new Date(anoAtual, hoje.getMonth(), 5), 
      referencia: `MANUAL${Date.now().toString().slice(-6)}`,
    });

    res.status(201).json({ 
      mensagem: `Fatura de ${mesFormatado} gerada com sucesso!`, 
      novoPagamento 
    });

  } catch (error) {
    console.error("Erro ao gerar fatura:", error);
    res.status(500).json({ erro: "Erro interno ao gerar fatura." });
  }
};
