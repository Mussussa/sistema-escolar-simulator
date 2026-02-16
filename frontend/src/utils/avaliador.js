export const calcularStatusAluno = (
  notas, 
  configuracoes, 
  totalPresencas = 0, 
  aulasPlanejadas = 30
) => {
  // 1. Cálculo da Frequência
  const aulas = Number(aulasPlanejadas) || 1; 
  const percPresenca = (Number(totalPresencas) / aulas) * 100;
  const reprovadoPorFaltas = percPresenca < 50;

  // 2. Cálculo da MF (Média em Percentagem)
  // Filtra notas válidas e ordena para o caso de precisar descartar as piores
  const notasOrdenadas = [...notas]
    .filter(n => n.valor !== null && n.valor !== undefined && n.valor !== "")
    .sort((a, b) => Number(b.valor) - Number(a.valor));

  let somaPonderada = 0;
  configuracoes.forEach((conf, index) => {
    const nota = notasOrdenadas[index]; 
    if (nota) {
      somaPonderada += (Number(nota.valor) * (Number(conf.peso) / 100));
    }
    console.log(`Nota ${index + 1}:`, nota ? nota.valor : "N/A", `Peso: ${conf.peso}%`);
  });

  const mf = somaPonderada; // Média Final em %
  
  // 3. Critérios de Aprovação Direta (Sem Exame)
  let situacao = "";
  let statusFinal = "";

  if (reprovadoPorFaltas) {
    situacao = "Excluído (Faltas)";
    statusFinal = `Não alcançou (Faltas ${100 - percPresenca.toFixed(0)}%)`;
  } else {
    // Se não há exame, a nota de aprovação costuma ser 50% (10 valores)
    if (mf >= 80) {
      situacao = "Alcançou";
      statusFinal = `Alcançou (${mf.toFixed(0)}%)`;
    } else {
      situacao = "Não alcançou";
      statusFinal = `Não alcançou  (${mf.toFixed(0)}%)`;
    }
  }

  return { 
    mf: mf.toFixed(0), 
    situacao, 
    statusFinal, 
    percPresenca: percPresenca.toFixed(0) 
  };
};