import React, { useEffect, useState } from "react";
import api from "../api/api";
import "../styler/dashboard.css";

const HistoricoAcademico = () => {
  const [dados, setDados] = useState({ notas: [], faltas: [] });
  // Estado inicial definido como "4"
  const [vocacional, setVocacional] = useState("4");
  const [loading, setLoading] = useState(false);

  // Lista de opções para o Select
  const niveisVocacionais = [
    { valor: "3", label: "CV3 (Nível 3)" },
    { valor: "4", label: "CV3 (Nível 4)" },
    { valor: "5", label: "CV6 (Nível 5)" },
  ];

  const carregarHistorico = async () => {
    try {
      setLoading(true);
      // Busca os dados baseados no nível selecionado
      const [notasRes, faltasRes] = await Promise.all([
        api.get(`/aluno/notas?vocacional=${vocacional}`),
        api.get(`/aluno/faltas?vocacional=${vocacional}`),
      ]);

      setDados({
        notas: notasRes.data,
        faltas: faltasRes.data,
      });
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    } finally {
      setLoading(false);
    }
  };

  // Recarrega sempre que o usuário muda o filtro "vocacional"
  useEffect(() => {
    carregarHistorico();
  }, [vocacional]);

  return (
    <div className="dashboard-container">
      <header className="dash-header">
        <h1>Histórico Acadêmico</h1>
        
        {/* --- CORREÇÃO AQUI --- */}
        {/* Substituído o filtro de 'ano' (que não existia) pelo filtro de 'vocacional' */}
        <div className="filtro-ano">
          <label>Filtrar por Nível: </label>
          <select 
            value={vocacional} 
            onChange={(e) => setVocacional(e.target.value)}
          >
            {niveisVocacionais.map((nivel) => (
              <option key={nivel.valor} value={nivel.valor}>
                {nivel.label}
              </option>
            ))}
          </select>
        </div>
        {/* --------------------- */}
      </header>

      {loading ? (
        <div className="loader">Sincronizando dados do CV{vocacional}...</div>
      ) : (
        <div className="dash-grid">
          {/* TABELA DE NOTAS CONSOLIDADA */}
          <section
            className="dash-card notas"
            style={{ gridColumn: "1 / -1", maxHeight: "none" }}
          >
            <h3>
              <i className="fas fa-graduation-cap"></i> Notas Consolidadas - CV{vocacional}
            </h3>
            <div className="table-responsive">
              <table
                style={{
                  borderCollapse: "collapse",
                  width: "100%", // Ajustei para 100% para não quebrar o layout
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                  margin: "0 5px",
                }}
              >
                <thead>
                  <tr>
                    <th>Disciplina</th>
                    <th className="text-center">Avaliações</th>
                    <th className="text-center">Média Final</th>
                    <th className="text-center">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.notas.length > 0 ? (
                    dados.notas.map((n, idx) => (
                      <tr key={idx}>
                        <td
                          style={{
                            fontWeight: "600",
                            wordWrap: "break-word",
                            whiteSpace: "normal",
                          }}
                        >
                          {n.disciplina}
                        </td>
                        <td className="text-center" style={{ color: "#666" }}>
                          {n.testes}
                        </td>
                        <td
                          className="text-center"
                          style={{ fontWeight: "bold", color: "#2c3e50" }}
                        >
                          {n.mediaFinal}
                        </td>
                        <td className="text-center">
                          <span
                            style={{ fontSize: "10px" }}
                            className={`badge-status ${n.situacao?.toLowerCase().replace(/\s/g, "-")}`}
                          >
                            {n.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="vazio">
                        Nenhuma nota consolidada para o nível CV{vocacional}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* RESUMO DE FALTAS */}
          <section
            className="dash-card faltas"
            style={{ gridColumn: "1 / -1", maxHeight: "none" }}
          >
            <h3>
              <i className="fas fa-user-times"></i> Faltas Acumuladas - CV{vocacional}
            </h3>
            <div className="table-responsive">
              <table
                className="mini-table"
                style={{
                  borderCollapse: "collapse",
                  width: "100%",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                  margin: "0 5px",
                  color: "#080101",
                }}
              >
                <thead>
                  <tr>
                    <th>Disciplina</th>
                    <th>Datas</th>
                    <th className="text-center">Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.faltas.length > 0 ? (
                    dados.faltas.map((f, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: "bold", color: "#333" }}>
                          {/* Verificação para evitar erro se disciplina for null */}
                          {f.disciplina?.nome || f.disciplina}
                        </td>
                        <td>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "#666",
                              marginTop: "4px",
                            }}
                          >
                            <i
                              className="far fa-calendar-alt"
                              style={{ marginRight: "5px" }}
                            ></i>
                            {f.datas
                              ?.map((d) =>
                                new Date(d).toLocaleDateString("pt-BR"),
                              )
                              .join(", ") || "Sem datas"}
                          </div>
                        </td>
                        <td
                          className={`text-center font-bold ${parseInt(f.totalFaltas) > 10 ? "critico" : ""} `}
                        >
                          {f.totalFaltas}
                        </td>
                        <td>
                          <span
                            className={`badge ${parseInt(f.percPresenca) < 50 ? "erro" : "sucesso"}`}
                          >
                            {f.status} ({f.percPresenca})
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="vazio">
                        Nenhuma falta registrada para o nível CV{vocacional}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default HistoricoAcademico;