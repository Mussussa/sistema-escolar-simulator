import React, { useState, useEffect } from "react";
import api from "../api/api";
import "../styler/historico.css";

const HistoricoAluno = () => {
  // --- Estados Principais ---
  const [busca, setBusca] = useState("");
  const [alunos, setAlunos] = useState([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);
  const [loading, setLoading] = useState(false);

  // --- Estados do Modal de Regularização ---
  const [showModal, setShowModal] = useState(false);
  const [notasManuais, setNotasManuais] = useState([]);
  const [disciplinasModal, setDisciplinasModal] = useState([]); 
  const [loadingModal, setLoadingModal] = useState(false);
  const [filtroVocacional, setFiltroVocacional] = useState("Todos");

  // --- 1. Função de Pesquisa ---
  const pesquisar = async () => {
    if (!busca) return;
    setLoading(true);
    try {
      const res = await api.get(`/matricula/busca-global?q=${busca}`);
      setAlunos(res.data);
      setAlunoSelecionado(null);
    } catch (err) {
      console.error("Erro na pesquisa:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- 2. Abrir Modal e Carregar Grade ---
  const abrirModalRegularizacao = async () => {
    if (!alunoSelecionado) return;
    setLoadingModal(true);
    try {
      const res = await api.get(
        `/matricula/disciplinas-regularizacao/${alunoSelecionado.id}`,
      );
      setDisciplinasModal(res.data);
      setNotasManuais([]);
      setFiltroVocacional("Todos"); 
      setShowModal(true);
    } catch (err) {
      console.error("Erro ao carregar disciplinas:", err);
      alert("Erro ao carregar a grade curricular do aluno.");
    } finally {
      setLoadingModal(false);
    }
  };

  // --- 3. Manipular Input de Nota no Modal ---
  const handleNotaChange = (disciplinaId, valor) => {
    if (!disciplinaId) return;
    setNotasManuais((prev) => {
      const filtradas = prev.filter((n) => n.disciplinaId !== disciplinaId);
      if (valor === "") return filtradas;
      return [...filtradas, { disciplinaId, media: parseFloat(valor) }];
    });
  };

  // --- 4. Salvar Regularização ---
  const salvarRegularizacao = async () => {
    try {
      const notasInvalidas = notasManuais.some(
        (n) => n.media < 0 || n.media > 100,
      );
      if (notasInvalidas) return alert("As notas devem estar entre 0% e 100%");
      
      if (notasManuais.length === 0) {
        return alert("Insira pelo menos uma nota.");
      }

      const response = await api.post("/matricula/regularizar-veterano", {
        alunoId: alunoSelecionado.id,
        notasAntigas: notasManuais,
      });

      if (response.data.avisos && response.data.avisos.length > 0) {
        alert(`Sucesso parcial!\n\n${response.data.avisos.join("\n")}`);
      } else {
        alert("Histórico atualizado com sucesso!");
      }

      setShowModal(false);
      pesquisar(); // Atualiza a ficha após salvar
    } catch (err) {
      alert(err.response?.data?.erro || "Erro de conexão.");
    }
  };

  // --- 5. Filtro do Modal ---
  // LÓGICA DE FILTRAGEM
  const disciplinasFiltradas = disciplinasModal.filter(d => {
    if (filtroVocacional === "Todos") return true;

    // Proteção contra valores nulos
    if (!d.vocacional) return false; 

    // Comparação Segura (Converte ambos para String)
    return String(d.vocacional) === String(filtroVocacional);
  });

  return (
    <div className="historico-container">
      {/* HEADER DE BUSCA */}
      <header className="busca-header no-print">
        <h1>🎓 Secretaria: Consulta Acadêmica Integral</h1>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Nome ou matrícula..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && pesquisar()}
          />
          <button onClick={pesquisar} disabled={loading}>
            {loading ? "Buscando..." : "Pesquisar"}
          </button>
        </div>
      </header>

      <div className="main-content">
        {/* SIDEBAR: LISTA DE ALUNOS */}
        <aside className="alunos-lista no-print">
          {alunos.length === 0 && (
            <p className="empty-msg">Nenhum aluno encontrado.</p>
          )}
          {alunos.map((aluno) => (
            <div
              key={aluno.id}
              className={`aluno-item ${alunoSelecionado?.id === aluno.id ? "active" : ""}`}
              onClick={() => setAlunoSelecionado(aluno)}
            >
              <div className={`status-dot ${aluno.corFinanceira}`}></div>
              <div>
                <strong>{aluno.nome}</strong>
                <small>{aluno.curso}</small>
              </div>
            </div>
          ))}
        </aside>

        {/* ÁREA PRINCIPAL: FICHA DETALHADA */}
        <main className="ficha-detalhada">
          {alunoSelecionado ? (
            <div className="ficha-print">
              <div className="watermark">SECRETARIA</div>
              
              {/* CABEÇALHO DA FICHA */}
              <section className="bloco-info">
                <div className="header-ficha">
                  <h2>Ficha de Rendimento Acadêmico</h2>
                  <div className="acoes-secretaria no-print">
                    <button
                      className="btn-regularizar"
                      onClick={abrirModalRegularizacao}
                      disabled={loadingModal}
                    >
                      {loadingModal ? "Carregando..." : "⚙️ Regularizar Veterano"}
                    </button>
                  </div>
                  <span className={`badge-financeiro ${alunoSelecionado.corFinanceira}`}>
                    {alunoSelecionado.statusFinanceiro}
                  </span>
                </div>

                <div className="grid-info">
                  <p><strong>Nome:</strong> {alunoSelecionado.nome}</p>
                  <p><strong>Curso:</strong> {alunoSelecionado.curso}</p>
                  <p><strong>ID Matrícula:</strong> {alunoSelecionado.id.substring(0, 8).toUpperCase()}</p>
                </div>
              </section>

              {/* TABELA DE NOTAS */}
              <section className="bloco-notas">
                <h3>📊 Desempenho por Disciplina</h3>
                <table className="tabela-notas">
                  <thead>
                    <tr>
                      <th>Disciplina</th>
                      <th>Avaliações Realizadas</th>
                      <th>Média Final</th>
                      <th>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alunoSelecionado.desempenhoAcademico.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: "600", wordWrap: "break-word", maxWidth: "250px" }}>
                          {item.disciplina}
                        </td>
                        <td>
                          <div className="notas-detalhe">
                            {item.notas.map((n, i) => (
                              <span key={i}>{n.valor}% ¦ </span>
                            ))}
                          </div>
                        </td>
                        <td className="txt-center"><strong>{item.mediaFinal}%</strong></td>
                        <td>
                          <span className="status-tag" style={{ color: item.cor }}>
                            {item.situacao}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              {/* HISTÓRICO FINANCEIRO */}
              <section className="bloco-financeiro">
                <h3>💰 Histórico de Pagamentos</h3>
                <div className="pagamentos-grid">
                  {alunoSelecionado.pagamentos.slice(0, 12).map((pag) => (
                    <div
                      key={pag.id || `${pag.mes}${pag.ano}`}
                      className={`pag-box ${pag.status}`}
                    >
                      <small>{pag.mes}</small>
                      <strong>{pag.status === "pago" ? "✓" : "✗"}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <button className="btn-imprimir no-print" onClick={() => window.print()}>
                🖨️ Gerar PDF / Imprimir
              </button>
            </div>
          ) : (
            <div className="placeholder">
              <p>Selecione um aluno para visualizar os detalhes.</p>
            </div>
          )}
        </main>
      </div>

      {/* --- MODAL COM SCROLL HORIZONTAL --- */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content grande">
            <h2>Regularizar: {alunoSelecionado?.nome}</h2>
            
            <hr />

            {/* BARRA DE FILTROS */}
            <div className="cabecalho-filtro">
              <strong>Grade Curricular:</strong>
              <div className="filtros-botoes">
                 {["Todos", "3", "4", "5"].map(cv => (
                   <button 
                     key={cv}
                     className={filtroVocacional === cv ? "btn-filtro active" : "btn-filtro"}
                     onClick={() => setFiltroVocacional(cv)}
                   >
                     {cv === "Todos" ? "Todos" : `CV${cv}`}
                   </button>
                 ))}
              </div>
            </div>

            {/* CONTAINER COM SCROLL EM X */}
            <div className="scroll-container-x">
              <div className="lista-disciplinas-horizontal">
                {disciplinasFiltradas.map((d) => (
                  <div key={d.id} className="card-disciplina-mini">
                    <span className="badge-cv-mini">CV{d.vocacional}</span>
                    <span className="nome-disc" title={d.nome}>{d.nome}</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="%"
                      onChange={(e) => handleNotaChange(d.id, e.target.value)}
                    />
                  </div>
                ))}
                {disciplinasFiltradas.length === 0 && <p>Nenhuma disciplina encontrada.</p>}
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn-cancel">Cancelar</button>
              <button className="btn-save" onClick={salvarRegularizacao}>
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoricoAluno;