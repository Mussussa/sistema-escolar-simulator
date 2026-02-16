// utils/calculadoraFinancas.js
exports.verificarEAplicarMulta = (pagamento) => {
  const hoje = new Date();
  const vencimento = new Date(pagamento.data_vencimento);

  // Se passou da data e ainda não foi pago nem aplicada a multa
  if (hoje > vencimento && pagamento.status !== 'pago' && !pagamento.multa_aplicada) {
    const novoValor = parseFloat(pagamento.valor_base) * 1.05; // +25%
    return {
      valor_base: novoValor,
      multa_aplicada: true,
      status: 'atrasado'
    };
  }
  return null;
};