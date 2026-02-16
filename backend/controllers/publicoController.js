const Joi = require("joi");
const { Pagamento, Aluno } = require("../models");

exports.validarReciboPublico = async (req, res) => {
  try {
    // 1. Esquema de Validação Joi para o parâmetro da URL
    const schema = Joi.object({
      referencia: Joi.string().trim().min(4).max(18).required().messages({
        "string.empty": "A referência não pode estar vazia.",
        "string.min": "Referência muito curta.",
        "string.max": "Referência inválida."
      })
    });

    // 2. Executar Validação
    const { error, value } = schema.validate(req.params);

    if (error) {
      return res.status(400).send(`
        <div style="text-align:center; font-family:sans-serif; margin-top:50px;">
          <h1 style="color:orange;">⚠️ Formato Inválido</h1>
          <p>${error.details[0].message}</p>
        </div>
      `);
    }

    const { referencia } = value;

    // 3. Busca o pagamento no banco
    const pagamento = await Pagamento.findOne({
      where: { referencia: referencia, status: 'pago' },
      include: [{ model: Aluno, as: "aluno", attributes: ['nome'] }]
    });

    // 

    if (!pagamento) {
      return res.status(404).send(`
        <div style="text-align:center; font-family:sans-serif; margin-top:50px;">
          <h1 style="color:red;">❌ Recibo Inválido</h1>
          <p>Esta referência não foi encontrada ou o pagamento ainda não foi confirmado.</p>
          <p style="color:#666; font-size:12px;">Referência consultada: ${referencia}</p>
        </div>
      `);
    }

    // 4. Retorno de Sucesso (HTML amigável para mobile)
    res.send(`
      <div style="text-align:center; font-family:sans-serif; margin:30px auto; border: 2px solid #003366; padding: 20px; max-width: 400px; border-radius: 10px;">
        <div style="font-size: 50px;">✅</div>
        <h1 style="color:#003366; margin-bottom:10px;">Recibo Autêntico</h1>
        <p style="background:#f4f4f4; padding:10px; border-radius:5px;"><strong>Referência:</strong> ${pagamento.referencia}</p>
        <div style="text-align:left; margin-top:20px;">
          <p><strong>Estudante:</strong> ${pagamento.aluno.nome}</p>
          <p><strong>Data:</strong> ${new Date(pagamento.data_confirmacao).toLocaleDateString('pt-PT')}</p>
          <p><strong>Valor Pago:</strong> ${pagamento.valor_pago.toLocaleString()} MT</p>
        </div>
        <hr style="border:1px solid #eee; margin:20px 0;">
        <p style="font-size:12px; color:#666;">HILA - Instituto Politécnico<br>Sistema de Verificação de Autenticidade</p>
      </div>
    `);
  } catch (error) {
    console.error("Erro na validação pública:", error);
    res.status(500).send("Erro interno ao validar o recibo.");
  }
};