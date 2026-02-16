const calcularResultadoFinal = (
  notas,
  notaExame = null,
  notaRecorrencia = null,
  totalPresencas = 0,
  aulasPlanejadas = 30,
) => {
  // 1. Validação de Presença (Mínimo 80%)
  const freq = (totalPresencas / aulasPlanejadas) * 100;
  const reprovadoPorFalta = freq < 50;

  // 2. Calcular a Média de Frequência (MF)
  let mf = 0;
  if (notas && notas.length > 0) {
    mf = notas.reduce((acc, n) => acc + n.valor * (n.peso / 100), 0);
  }
  mf = parseFloat(mf.toFixed(2));

  let situacao = "";
  let mediaFinal = mf;

  // 3. CRITÉRIOS DE DECISÃO
  if (reprovadoPorFalta) {
    situacao = "Excluído (Faltas)";
    mediaFinal = mf;
  } else if (mf >= 14) {
    situacao = "Dispensado";
  } else if (mf < 10) {
    situacao = "Excluído";
  } else {
    situacao = "Admitido a Exame";

    // Lógica de Exame e Recorrência (apenas se tiver presença)
    if (notaExame !== null && notaExame !== undefined) {
      mediaFinal = (mf + notaExame) / 2;
      if (mediaFinal >= 10) {
        situacao = "Aprovado";
      } else {
        situacao = "Admitido a Recorrência";
        if (notaRecorrencia !== null && notaRecorrencia !== undefined) {
          mediaFinal = (mf + notaRecorrencia) / 2;
          situacao = mediaFinal >= 10 ? "Aprovado (Recorrência)" : "Reprovado";
        }
      }
    }
  }

  return {
    mf: mf,
    mediaFinal: parseFloat(mediaFinal.toFixed(2)),
    situacao: situacao,
    freq: freq.toFixed(0) + "%",
  };
};
