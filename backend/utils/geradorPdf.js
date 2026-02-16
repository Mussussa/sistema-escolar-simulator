const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");
const extenso = require("extenso");

// --- CORREÇÃO AQUI ---
// Importamos a instância 'supabase' já configurada, em vez de tentar recriar o cliente.
const supabase = require('../config/supabase');

exports.gerarReciboOficial = (pagamento, aluno) => {
  return new Promise(async (resolve, reject) => {
    try {
      // 1. Preparar caminhos dos Assets (Logo e Carimbo)
      const logoPath = path.join(__dirname, "../public/logo.jpeg"); 
      const carimboPath = path.join(__dirname, "../public/carimbo_assinatura.png");

      // 2. Criar o documento PDF
      const doc = new PDFDocument({
        size: "A6",
        layout: "landscape",
        margin: 10,
        info: {
          Title: `Recibo ${pagamento.referencia}`,
          Author: "HILA SISTEMA",
        },
      });

      // --- MÁGICA DO RENDER: Gravar em Memória (Buffer) ---
      let buffers = [];
      doc.on("data", (buffers.push.bind(buffers)));
      
      // Quando o PDF terminar
      doc.on("end", async () => {
        try {
            const pdfData = Buffer.concat(buffers);

            // 3. Upload para o Supabase Storage
            const fileName = `recibos/recibo-${pagamento.referencia}-${Date.now()}.pdf`;

            // Usamos a variável 'supabase' que importamos lá em cima
            const { data, error } = await supabase.storage
            .from('documentos') 
            .upload(fileName, pdfData, {
                contentType: 'application/pdf',
                upsert: false
            });

            if (error) {
                console.error("Erro no upload do recibo Supabase:", error);
                return reject(error);
            }

            // 4. Pegar a URL Pública
            const { data: publicUrlData } = supabase.storage
            .from('documentos')
            .getPublicUrl(fileName);

            resolve(publicUrlData.publicUrl);
            
        } catch (uploadErr) {
            reject(uploadErr);
        }
      });

      // --- DESENHO DO PDF (Mantido igual) ---
      const linkValidacao = `https://ubuntu-web-solution-hila.onrender.com/validar/${pagamento.referencia}`;
      const qrCodeDataUrl = await QRCode.toDataURL(linkValidacao, { margin: 1 });

      const valorTotal = parseFloat(pagamento.valor_pago);
      let extensoMZN = "Valor inválido";
      try {
        extensoMZN = extenso(valorTotal, { mode: "currency", currency: { type: 'BRL' } }) 
          .replace(/reais/g, "meticais")
          .replace(/real/g, "metical")
          .replace(/centavos/g, "centavos");
      } catch (e) { console.log("Erro no extenso", e) }

      doc.save().opacity(0.1); 
      const centerX = doc.page.width / 2;
      const centerY = doc.page.height / 2;
      
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, centerX - 50, centerY - 50, { width: 100 });
      }
      
      doc.rotate(-30, { origin: [centerX, centerY] })
         .fontSize(18)
         .fillColor("#003366")
         .text("PAGO - HINSTEC", centerX - 80, centerY, { align: "center" });
      doc.restore();

      doc.rect(5, 5, doc.page.width - 10, doc.page.height - 10)
         .lineWidth(1)
         .stroke("#003366");

      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, doc.page.width / 2 - 18, 10, { width: 36 });
      }

      doc.fontSize(8).fillColor("#003366").font("Helvetica-Bold")
         .text("HILA - INSTITUTO POLITÉCNICO", 0, 50, { align: "center" });
      
      doc.fontSize(9).fillColor("#000").font("Helvetica")
         .text("RECIBO DE PAGAMENTO", 0, 62, { align: "center", underline: true });

      const gridTop = 75;
      const startX = 20;

      doc.rect(startX, gridTop, 250, 20).stroke();
      doc.fontSize(6).fillColor("#666").text("ESTUDANTE:", startX + 5, gridTop + 3);
      doc.fontSize(8).fillColor("#000").text(aluno.nome.toUpperCase(), startX + 5, gridTop + 10);

      doc.rect(startX, gridTop + 25, 250, 22).fill("#f2f2f2").stroke("#ccc");
      doc.fontSize(6).fillColor("#666").text("IMPORTÂNCIA DE:", startX + 5, gridTop + 28);
      doc.fontSize(7).fillColor("#000").font("Helvetica-BoldOblique")
         .text(`${extensoMZN.toUpperCase()} ***`, startX + 5, gridTop + 36, { width: 240 });

      doc.font("Helvetica").fontSize(7).fillColor("#000");
      doc.text(`CURSO: ${aluno.Curso?.nome || "GERAL"}`, startX, gridTop + 55);
      doc.text(`REFERÊNCIA: ${pagamento.referencia}`, startX, gridTop + 65);
      doc.text(`MÊS: ${pagamento.mes}/${pagamento.ano}`, startX, gridTop + 75);

      const valorBoxX = doc.page.width - 105;
      doc.rect(valorBoxX, gridTop, 85, 45).lineWidth(1.5).fillAndStroke("#003366", "#003366");
      doc.fontSize(7).fillColor("#fff").text("VALOR PAGO", valorBoxX, gridTop + 10, { align: "center", width: 85 });
      doc.fontSize(11).text(`${valorTotal.toLocaleString()} MT`, valorBoxX, gridTop + 25, { align: "center", bold: true, width: 85 });

      const qrSize = 45;
      const qrX = valorBoxX + 85 / 2 - qrSize / 2;
      doc.image(qrCodeDataUrl, qrX, gridTop + 50, { width: qrSize });
      doc.fillColor("#666").fontSize(5).text("AUTENTICIDADE", qrX, gridTop + 50 + qrSize + 2, { align: "center", width: qrSize });

      if (fs.existsSync(carimboPath)) {
        doc.image(carimboPath, startX + 50, doc.page.height - 65, { width: 90 });
      }
      doc.moveTo(startX, doc.page.height - 25).lineTo(startX + 150, doc.page.height - 25).lineWidth(0.5).stroke("#000");
      doc.fontSize(6).fillColor("#000").text("ASSINATURA (SECRETARIA)", startX, doc.page.height - 22, { align: "center", width: 150 });

      doc.end();

    } catch (err) {
      console.log("erro a gerar recibo" , err)
      reject(err);
    }
  });
};