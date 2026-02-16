const {
  Aluno,
  Turma,
  Curso,
  Disciplina,
  Horario,
  Professor,
  Nota,
  Presenca,
  Aviso,
  Pagamento,
  ConfiguracaoAvaliacao,
  Sequelize,
} = require("../models");

// Importação segura do Op caso o seu models/index.js não o forneça
const { Op } = require("sequelize");
exports.obterPainelAcademico = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;

    const aluno = await Aluno.findOne({
      where: { usuarioId },
      include: [
        {
          model: Turma,
          as: "turma",
          include: [
            { model: Curso, as: "curso", attributes: ["nome", "duracao_anos" , "regime"] },
            {
              model: Horario,
              as: "horarios",
              include: [
                { model: Disciplina, as: "disciplina", attributes: ["nome"] },
              ],
            },
          ],
        },
      ],
      // Garante que o JSON venha ordenado por dia e tempo
      order: [
        [
          { model: Turma, as: "turma" },
          { model: Horario, as: "horarios" },
          "dia_semana",
          "ASC",
        ],
        [
          { model: Turma, as: "turma" },
          { model: Horario, as: "horarios" },
          "ordem_tempo",
          "ASC",
        ],
      ],
    });

    if (!aluno)
      return res.status(404).json({ erro: "Perfil de aluno não encontrado." });
    if (!aluno.turmaId)
      return res
        .status(403)
        .json({ erro: "Aluno ainda não vinculado a uma turma." });

    res.json(aluno);
  } catch (error) {
    console.error("Erro no Painel Aluno:", error);
    res.status(500).json({ erro: "Erro ao carregar dados acadêmicos." });
  }
};

// Importe o utilitário de cálculo no topo do arquivo

// Função de cálculo (caso não queira importar, pode colar esta lógica no topo do arquivo)
const calcularMediaFinal = (notas, exame, rec) => {
  const mf = notas.reduce((acc, n) => acc + n.valor * (n.peso / 100), 0);

  let mediaFinal = mf;
  let situacao = "";

  if (mf < 10) {
    situacao = "Excluído";
  } else {
    // Se tem exame
    const notaExame = Number(exame) || 0;
    const notaRec = Number(rec) || 0;

    mediaFinal = (mf + Math.max(notaExame, notaRec)) / 2;

    if (mediaFinal >= 10) {
      situacao = "Alcançou";
    } else if (notaExame < 10 && notaRec === 0) {
      situacao = "Admitido a Rec.";
    } else {
      situacao = "Não Alcançou";
    }
  }

  return {
    mf: mf.toFixed(1),
    mediaFinal: mediaFinal.toFixed(1),
    situacao,
  };
};

exports.obterNotasAlunoConsolidado = async (req, res) => {
  try {
    const { vocacional } = req.query; // Filtro: CV4, CV5 ou CV6
    const usuarioId = req.usuarioId;

    // 1. Buscar ID do Aluno
    const aluno = await Aluno.findOne({ where: { usuarioId } });
    if (!aluno) return res.status(404).json({ erro: "Aluno não encontrado." });

    // 2. Buscar Notas e Presenças em Paralelo (Filtrando pelo Nível Vocacional)
    const [notas, presencas] = await Promise.all([
      Nota.findAll({
        where: { alunoId: aluno.id },
        include: [
          { 
            model: Disciplina, 
            as: "disciplina", 
            where: vocacional ? { vocacional } : {} // Filtra disciplina pelo CV
          },
          { model: ConfiguracaoAvaliacao, as: "ConfiguracaoAvaliacao" },
        ],
      }),
      Presenca.findAll({
        where: { alunoId: aluno.id },
        include: [
          { 
            model: Disciplina, 
            as: "disciplina", 
            attributes: ["id", "aulas_planejadas"], // Necessário para calcular %
            where: vocacional ? { vocacional } : {} 
          },
        ],
      }),
    ]);

    // 3. Calcular Percentagem de Presença por Disciplina
    const mapaPresencas = {}; // { disciplinaId: { faltas: 2, totalAulas: 30 } }

    presencas.forEach((p) => {
      const dId = p.disciplinaId;
      
      if (!mapaPresencas[dId]) {
        // Pega o total de aulas planejadas da disciplina (padrão 30 se não tiver)
        const total = p.disciplina?.aulas_planejadas || 30;
        mapaPresencas[dId] = { faltas: 0, totalAulas: total };
      }

      // Conta apenas faltas injustificadas ("F") para penalização
      // Se quiser contar todas (F + FJ), remova o 'if'
      if (p.status === "F") {
        mapaPresencas[dId].faltas += 1;
      }
    });

    // 4. Agrupar Notas e Consolidar Resultado
    const disciplinasMap = {};

    notas.forEach((n) => {
      if (!n.disciplina) return;
      const dId = n.disciplinaId;

      if (!disciplinasMap[dId]) {
        disciplinasMap[dId] = {
          id: dId,
          nome: n.disciplina.nome,
          avaliacoes: [],
        };
      }
      disciplinasMap[dId].avaliacoes.push({
        nome: n.ConfiguracaoAvaliacao?.nome || "Avaliação",
        valor: Number(n.valor),
        peso: Number(n.ConfiguracaoAvaliacao?.peso || 0),
      });
    });

    // 5. Aplicar a Regra de Ouro (50% Presença + 80% Nota)
    const resultado = Object.values(disciplinasMap).map((d) => {
      // A. Média Ponderada
      const mf = d.avaliacoes.reduce((acc, curr) => {
        return acc + curr.valor * (curr.peso / 100);
      }, 0);

      // B. Presença
      const dadosPresenca = mapaPresencas[d.id] || { faltas: 0, totalAulas: 30 };
      // Fórmula: (Total - Faltas) / Total * 100
      const calcPresenca = ((dadosPresenca.totalAulas - dadosPresenca.faltas) / dadosPresenca.totalAulas) * 100;
      // Garante que não fica negativo e fixa em 0 casas decimais
      const percPresenca = Math.max(0, calcPresenca).toFixed(0);

      // C. Lógica de Status
      let status = "";
      
      // REGRA 1: Se tiver MENOS de 50% de presença, reprova direto.
      if (percPresenca < 50) {
        status = "Reprovado (Faltas)";
      } 
      // REGRA 2: Se tiver presença OK, verifica se a nota é >= 80
      else if (mf >= 80) {
        status = "Alcançou";
      } 
      // REGRA 3: Tem presença, mas nota baixa
      else {
        status = "Não Alcançou";
      }

      return {
        disciplina: d.nome,
        // Exibe as notas individuais: "100% | 80%"
        testes: d.avaliacoes.map((a) => `${a.valor}%`).join(" | "),
        mediaFinal: mf.toFixed(2),
        presenca: `${percPresenca}%`, // Envia a % para mostrar no front se quiseres
        status: status,
      };
    });

    res.json(resultado);
  } catch (error) {
    console.error("Erro ao consolidar notas:", error);
    res.status(500).json({ erro: error.message });
  }
};

exports.obterFaltasAluno = async (req, res) => {
  try {
    // 1. Recebe o nível vocacional
    const { vocacional } = req.query; 

    const aluno = await Aluno.findOne({ where: { usuarioId: req.usuarioId } });
    
    if (!aluno) return res.status(404).json({ erro: "Aluno não encontrado." });

    // 2. Busca presenças filtrando pela Disciplina correta
    const presencas = await Presenca.findAll({
      where: { alunoId: aluno.id },
      include: [{ 
        model: Disciplina, 
        as: "disciplina", 
        attributes: ["nome", "aulas_planejadas", "vocacional"],
        // --- MUDANÇA AQUI ---
        // Filtra as presenças onde a disciplina pertence ao nível vocacional solicitado
        where: vocacional ? { vocacional: vocacional } : {}
      }]
    });

    const resumo = {};

    // 3. Agrupamos os dados
    presencas.forEach(p => {
      // Se a disciplina foi filtrada pelo 'where', p.disciplina existe.
      // Se não bater, o 'inner join' padrão do Sequelize já remove a presença da lista.
      const d = p.disciplina;
      
      if (!resumo[p.disciplinaId]) {
        resumo[p.disciplinaId] = { 
          nome: d?.nome || "Disciplina s/ nome", 
          aulas: d?.aulas_planejadas || 30, 
          f: 0, 
          fj: 0, 
          datas: [] 
        };
      }
      
      if (p.status === "F") {
        resumo[p.disciplinaId].f++;
        resumo[p.disciplinaId].datas.push(p.data);
      } else if (p.status === "FJ") {
        resumo[p.disciplinaId].fj++;
      }
    });

    // 4. Calculamos a porcentagem final
    const resultado = Object.values(resumo).map(d => {
      // Cálculo de percentagem de presença
      const perc = (((d.aulas - d.f) / d.aulas) * 100).toFixed(0);
      
      return {
        disciplina: d.nome,
        totalAusencias: d.f + d.fj,
        faltasParaReprovacao: d.f,
        justificadas: d.fj,
        percPresenca: `${perc}%`,
        // Regra de negócio: < 50% é crítico
        status: perc >= 50 ? "Regular" : "Crítico", 
        datas: d.datas
      };
    });

    res.json(resultado);
  } catch (error) {
    console.error("Erro no controller de faltas:", error);
    res.status(500).json({ erro: "Erro ao processar faltas." });
  }
};

exports.obterAvisosAluno = async (req, res) => {
  try {
    const aluno = await Aluno.findOne({ where: { usuarioId: req.usuarioId } });

    if (!aluno) return res.status(404).json({ erro: "Aluno não encontrado." });

    const avisos = await Aviso.findAll({
      where: {
        [Sequelize.Op.or]: [
          { cursoId: null, turmaId: null }, // Avisos para toda a escola
          { cursoId: aluno.cursoId }, // Avisos do curso dele
          { turmaId: aluno.turmaId }, // Avisos da turma dele
        ],
      },
      order: [["createdAt", "DESC"]],
      limit: 10, // Mostrar apenas os 10 mais recentes
    });

    res.json(avisos);
  } catch (error) {
    console.error("Erro ao buscar avisos:", error);
    res.status(500).json({ erro: "Erro ao carregar avisos." });
  }
};

// Adicione esta função ao seu arquivo alunoController.js

exports.obterHistoricoPagamentos = async (req, res) => {
  try {
    // 1. Localiza o aluno vinculado ao usuário
    const aluno = await Aluno.findOne({ where: { usuarioId: req.usuarioId } });

    if (!aluno) {
      return res.status(404).json({ erro: "Perfil de aluno não encontrado." });
    }

    // 2. Atualiza multas antes de mostrar (opcional, mas garante precisão)
    // Se a função aplicarMultasProgressivas estiver no mesmo arquivo, chame-a
    // await aplicarMultasProgressivas();

    // 3. Busca todos os pagamentos
    const pagamentos = await Pagamento.findAll({
      where: { alunoId: aluno.id },
      order: [
        ["ano", "DESC"],
        ["data_vencimento", "DESC"],
      ],
      attributes: [
        "id",
        "mes",
        "ano",
        "valor_original",
        "valor_atual",
        "valor_pago",
        "status",
        "data_vencimento",
        "data_confirmacao",
        "referencia",
        "talao_url",
      ],
    });

    res.json(pagamentos);
  } catch (error) {
    console.error("Erro ao buscar histórico de pagamentos:", error);
    res.status(500).json({ erro: "Erro ao carregar histórico financeiro." });
  }
};
