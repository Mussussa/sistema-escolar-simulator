import React, { useEffect, useState } from 'react';
import api from '../api/api';
import { 
  FaFilePdf, FaBarcode, FaCheckCircle, 
  FaExclamationCircle, FaClock, FaFileInvoiceDollar 
} from 'react-icons/fa';
import '../styler/financeiro.css';

const MeusPagamentos = () => {
  const [pagamentos, setPagamentos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const buscarPagamentos = async () => {
      try {
        const response = await api.get('/aluno/pagamentos');
        setPagamentos(response.data);
      } catch (error) {
        console.error("Erro ao carregar pagamentos:", error);
      } finally {
        setLoading(false);
      }
    };
    buscarPagamentos();
  }, []);

  

 const baixarRecibo = (url) => {
    if (!url) return alert("Recibo indisponível.");

    // URL do seu Backend no Render (onde estão os arquivos antigos)
    // ATENÇÃO: Não use barra / no final aqui
    const BACKEND_URL = "https://ubuntu-web-solution-hila.onrender.com"; 

    // CASO 1: Recibo Novo (Supabase)
    // Se o link já começa com "http", abrimos direto.
    if (url.startsWith("http") || url.startsWith("https")) {
      window.open(url, "_blank");
    } 
    // CASO 2: Recibo Antigo (Local)
    // Se o link começa com "/", precisamos colocar o domínio do Render antes.
    else {
      // O resultado será: https://...onrender.com/comprovativos/recibo...
      window.open(`${BACKEND_URL}${url}`, "_blank");
    }
  };

  if (loading) return <div className="loader">Carregando histórico financeiro...</div>;

  return (
    <div className="financeiro-aluno-container">
      <div className="fin-header">
        <h2><FaFileInvoiceDollar /> Meu Histórico de Propinas</h2>
        <p>Consulte o status de seus pagamentos e baixe seus recibos oficiais.</p>
      </div>

      <div className="tabela-scroll">
        <table className="tabela-fin">
          <thead>
            <tr>
              <th>Período</th>
              <th>Vencimento</th>
              <th>Valor (MT)</th>
              <th>Estado</th>
              <th>Ações / Referência</th>
            </tr>
          </thead>
          <tbody>
            {pagamentos.length > 0 ? pagamentos.map((p) => (
              <tr key={p.id} className={`linha-${p.status}`}>
                {/* O data-label deve bater exatamente com o nome da coluna */}
                <td data-label="Período">
                  <strong>{p.mes}</strong> <br />
                  <small>{p.ano}</small>
                </td>
                <td data-label="Vencimento">
                  {new Date(p.data_vencimento).toLocaleDateString('pt-BR')}
                </td>
                <td data-label="Valor (MT)">
                  <span className="valor-original">{p.valor_original}</span>
                  {p.valor_atual > p.valor_original && (
                    <span className="multa-aviso"> + Multa</span>
                  )}
                  <br />
                  <strong>{parseFloat(p.valor_atual).toFixed(2)} MT</strong>
                </td>
                <td data-label="Estado">
                  <span className={`status-badge ${p.status}`}>
                    {p.status === 'pago' && <FaCheckCircle />}
                    {p.status === 'atrasado' && <FaExclamationCircle />}
                    {p.status === 'pendente' && <FaClock />}
                    {p.status.toUpperCase()}
                  </span>
                </td>
                <td data-label="Ações">
                  {p.status === 'pago' ? (
                    <button className="btn-recibo" onClick={() => baixarRecibo(p.talao_url)}>
                      <FaFilePdf /> Baixar Recibo
                    </button>
                  ) : (
                    <div className="ref-pagamento">
                      <small>Pagar via Referência:</small>
                      <code><FaBarcode /> {p.referencia}</code>
                    </div>
                  )}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="5" className="sem-registros">
                  Nenhum registro financeiro encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="informativo-fin">
        <h4><FaExclamationCircle /> Observações:</h4>
        <ul>
          <li>Os recibos ficam disponíveis para download após confirmação.</li>
          <li>Pagamentos após o vencimento sofrem multa (5%).</li>
        </ul>
      </div>
    </div>
  );
};

export default MeusPagamentos;