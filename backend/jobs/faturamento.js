const cron = require("node-cron");
const { Aluno, Pagamento, Curso, LogFaturamento } = require("../models");
const { Op } = require("sequelize");

const iniciarFaturamentoAutomatico = () => {
  cron.schedule("0 0 25 * *", async () => { 
    console.log("--- INICIANDO CICLO DE FATURAMENTO ---");
    
    const hoje = new Date();
    // Gera para o PROXIMO mês
    const proximoMesData = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
    
    const mesRef = proximoMesData.toLocaleString("pt-PT", { month: "long" });
    const mesFormatado = mesRef.charAt(0).toUpperCase() + mesRef.slice(1);
    const anoRef = proximoMesData.getFullYear();


    
    // 1. DEFINIÇÃO DE FÉRIAS
    const mesesDeFerias = ["Janeiro", "Dezembro" , "Fevereiro"]; // Lista de meses de férias (ajuste conforme necessário)
    const eFerias = mesesDeFerias.includes(mesFormatado);

    // 2. O BLOQUEIO: Se for férias, mata o processo aqui!
    if (eFerias) {
      console.log(`--- 🏖️  BLOQUEIO: ${mesFormatado} é mês de férias. Nenhuma fatura será gerada. ---`);
      return; // O código pára aqui e não executa o loop de baixo
    }

    try {
      const alunos = await Aluno.findAll({
        where: { status: "doc_aprovado" },
        include: [{ model: Curso, as: "curso" }],
      });

      let faturasCriadas = 0;

      for (const aluno of alunos) {
        const existe = await Pagamento.findOne({
          where: { alunoId: aluno.id, mes: mesFormatado, ano: anoRef },
        });

        if (!existe && aluno.curso) {
          let valor = aluno.curso.duracao_anos === 3 ? 2500 : 1000;

          await Pagamento.create({
            alunoId: aluno.id,
            mes: mesFormatado,
            ano: anoRef,
            valor_original: valor,
            valor_atual: valor,
            status: "pendente",
            tipo_mes: "lectivo", // Como filtramos as férias acima, aqui será sempre lectivo
            data_vencimento: new Date(anoRef, proximoMesData.getMonth(), 5),
            referencia: `AUTO${Date.now().toString().slice(-6)}${aluno.id.slice(0,2)}`,
          });
          faturasCriadas++;
        }
      }

      // Log apenas quando houver faturamento real
      await LogFaturamento.create({
        mes_referencia: mesFormatado,
        ano_referencia: anoRef,
        total_faturas: faturasCriadas,
        status: "sucesso",
      });

      console.log(`✅ Ciclo Concluído: ${faturasCriadas} faturas geradas para ${mesFormatado}.`);
    } catch (err) {
      console.error("❌ Erro no Ciclo:", err);
    }
  });
};

module.exports = iniciarFaturamentoAutomatico;