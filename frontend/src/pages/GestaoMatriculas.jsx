import React, { useEffect, useState, useRef } from "react";
import api from "../api/api";
import "../styler/matricula.css";

const GestaoMatriculas = () => {
  const [lista, setLista] = useState([]);
  const [turmasAlocadas, setTurmasAlocadas] = useState([]);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });

  // --- ESTADOS PARA O RECURSO DE MOVER ---
  const [modalMoverOpen, setModalMoverOpen] = useState(false);
  const [alunoParaMover, setAlunoParaMover] = useState(null);
  const [turmasDisponiveis, setTurmasDisponiveis] = useState([]);
  const [turmaDestinoId, setTurmaDestinoId] = useState("");
  // --------------------------------------

  const [editandoId, setEditandoId] = useState(null);
  const [celulas, setCelulas] = useState(Array(18).fill(""));
  const inputsRef = useRef([]);

  const carregarCandidatos = async () => {
    try {
      const res = await api.get("/matricula/pendentes");
      setLista(res.data);
    } catch (error) {
      console.error("Erro ao carregar lista:", error);
    }
  };

  const carregarTurmasAlocadas = async () => {
    try {
      const res = await api.get("/matricula/turmas-alocadas");
      setTurmasAlocadas(res.data);
    } catch (error) {
      console.error("Erro ao carregar turmas:", error);
    }
  };

  useEffect(() => {
    carregarCandidatos();
    carregarTurmasAlocadas();
  }, []);

  useEffect(() => {
    if (mensagem.texto) {
      const timer = setTimeout(
        () => setMensagem({ texto: "", tipo: "" }),
        4000,
      );
      return () => clearTimeout(timer);
    }
  }, [mensagem]);

  // --- FUNÇÕES DE MOVER ALUNO (NOVAS) ---
  const abrirModalMover = async (aluno) => {
    try {
      // 1. Busca as turmas possíveis para este aluno
      const res = await api.get(`/matricula/turmas-disponiveis/${aluno.id}`);
      setTurmasDisponiveis(res.data);
      
      // 2. Prepara o modal
      setAlunoParaMover(aluno);
      setTurmaDestinoId(""); // Reseta seleção
      setModalMoverOpen(true);
    } catch (error) {
      setMensagem({ texto: "Erro ao buscar turmas disponíveis.", tipo: "erro" });
    }
  };

  const confirmarMover = async () => {
    if (!turmaDestinoId) {
      alert("Selecione uma turma de destino.");
      return;
    }

    try {
      await api.put("/matricula/remanejar-manual", {
        alunoId: alunoParaMover.id,
        novaTurmaId: turmaDestinoId
      });

      setMensagem({ texto: "✅ Aluno movido com sucesso!", tipo: "sucesso" });
      setModalMoverOpen(false);
      setAlunoParaMover(null);
      carregarTurmasAlocadas(); // Atualiza a lista na tela
    } catch (error) {
      const msg = error.response?.data?.erro || "Erro ao mover aluno.";
      setMensagem({ texto: `⚠️ ${msg}`, tipo: "erro" });
    }
  };
  // --------------------------------------

  // ... (TODA A TUA LÓGICA DE REFERÊNCIA, KEYDOWN, ETC MANTÉM-SE IGUAL) ...
  // ... (Estou ocultando para poupar espaço, mas mantem o teu código do handleInput, handleKeyDown, etc) ...
  
  const handleInput = (e, index) => {
    const val = e.target.value.toUpperCase();
    const novasCelulas = [...celulas];
    if (val === "") {
      novasCelulas[index] = "";
      setCelulas(novasCelulas);
      return;
    }
    const caractere = val.slice(-1);
    novasCelulas[index] = caractere;
    setCelulas(novasCelulas);
    if (index < 17 && caractere !== "") {
      inputsRef.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (!celulas[index] && index > 0) {
        const novasCelulas = [...celulas];
        novasCelulas[index - 1] = "";
        setCelulas(novasCelulas);
        inputsRef.current[index - 1].focus();
      } else {
        const novasCelulas = [...celulas];
        novasCelulas[index] = "";
        setCelulas(novasCelulas);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1].focus();
    } else if (e.key === "ArrowRight" && index < 17) {
      inputsRef.current[index + 1].focus();
    }
  };

  const confirmarAprovacao = async (alunoId) => {
    const parte1 = celulas.slice(0, 8).join("");
    const parte2 = celulas.slice(8, 12).join("");
    const parte3 = celulas.slice(12, 18).join("");
    const referenciaFinal = `${parte1}.${parte2}.${parte3}`;
    const regexReferencia = /^[a-zA-Z0-9]{8}\.[a-zA-Z0-9]{4}\.[a-zA-Z0-9]{6}$/;

    if (!regexReferencia.test(referenciaFinal)) {
      alert("Por favor, preencha todos os campos da referência.");
      return;
    }

    try {
      const res = await api.put(`/matricula/aprovar-doc/${alunoId}`, {
        referenciaManual: referenciaFinal,
      });

      setMensagem({
        texto: `✅ ${res.data.mensagem} Alocado em: ${res.data.dados.turma}`,
        tipo: "sucesso",
      });

      setEditandoId(null);
      setCelulas(Array(18).fill(""));
      carregarCandidatos();
      carregarTurmasAlocadas();
    } catch (error) {
      const erroServidor = error.response?.data?.erro || "Falha na comunicação";
      setMensagem({ texto: `⚠️ ${erroServidor}`, tipo: "erro" });
    }
  };

  const rejeitarCandidato = async (alunoId) => {
    const motivo = window.prompt("Digite o motivo da rejeição:");
    if (!motivo) return;
    try {
      const res = await api.put(`/matricula/rejeitar/${alunoId}`, { motivo });
      setMensagem({ texto: `⛔ ${res.data.mensagem}`, tipo: "sucesso" });
      carregarCandidatos();
    } catch (error) {
      setMensagem({ texto: "⚠️ Erro ao rejeitar", tipo: "erro" });
    }
  };

  return (
    <>
      {mensagem.texto && (
        <div className={`alerta-sistema ${mensagem.tipo}`}>
          {mensagem.texto}
        </div>
      )}

      {/* --- MODAL DE MOVER ALUNO (NOVO) --- */}
      {modalMoverOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>🔄 Mover Aluno</h3>
            <p><strong>Aluno:</strong> {alunoParaMover?.nome}</p>
            <p>Selecione a nova turma:</p>
            
            <div className="lista-turmas-mover">
              {turmasDisponiveis.length === 0 ? (
                <p style={{color: 'red'}}>Nenhuma outra turma disponível para este curso.</p>
              ) : (
                <select 
                  value={turmaDestinoId} 
                  onChange={(e) => setTurmaDestinoId(e.target.value)}
                  style={{ width: '100%', padding: '10px', marginBottom: '20px' }}
                >
                  <option value="">-- Selecione uma turma --</option>
                  {turmasDisponiveis.map(t => (
                    <option key={t.id} value={t.id} disabled={!t.temVaga}>
                      {t.nome} - ({t.ocupadas}/{t.vagas} vagas) {!t.temVaga && "(Cheia)"}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModalMoverOpen(false)}>Cancelar</button>
              <button 
                className="btn-save" 
                onClick={confirmarMover}
                disabled={!turmaDestinoId}
              >
                Confirmar Mudança
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="admin-container">
        <h2>Candidatos Aguardando Validação</h2>
        <table className="admin-table">
            {/* ... (SEU CÓDIGO DA TABELA MANTÉM-SE IGUAL) ... */}
            <thead>
            <tr>
              <th>Nome Completo</th>
              <th>Documento</th>
              <th style={{ width: "500px" }}>Ação / Referência</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((user) => (
              <tr key={user.id}>
                <td>{user.aluno?.nome}</td>
                <td>
                  {user.aluno?.documento_url && (
                    <a
                      href={user.aluno.documento_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-pdf"
                    >
                      📄 Abrir PDF
                    </a>
                  )}
                </td>

                <td>
                  {editandoId === user.aluno?.id ? (
                    <div className="referencia-wrapper">
                      <div className="referencia-grid">
                        {celulas.map((valor, i) => (
                          <React.Fragment key={i}>
                            <input
                              ref={(el) => (inputsRef.current[i] = el)}
                              className="celula-input"
                              maxLength={1}
                              value={valor}
                              onChange={(e) => handleInput(e, i)}
                              onKeyDown={(e) => handleKeyDown(e, i)}
                              onPaste={(e) => {
                                e.preventDefault();
                                const text = e.clipboardData
                                  .getData("text")
                                  .replace(/[^a-zA-Z0-9]/g, "")
                                  .toUpperCase();
                                const novas = [...celulas];
                                for (
                                  let k = 0;
                                  k < text.length && i + k < 18;
                                  k++
                                ) {
                                  novas[i + k] = text[k];
                                }
                                setCelulas(novas);
                                const nextIndex = Math.min(i + text.length, 17);
                                inputsRef.current[nextIndex]?.focus();
                              }}
                            />
                            {(i === 7 || i === 11) && (
                              <span className="separador-ponto">.</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>

                      <div className="referencia-actions">
                        <button
                          onClick={() => confirmarAprovacao(user.aluno.id)}
                          className="btn-icon btn-ok"
                          title="Confirmar"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => {
                            setEditandoId(null);
                            setCelulas(Array(18).fill(""));
                          }}
                          className="btn-icon btn-cancel"
                          title="Cancelar"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        className="btn-validar"
                        onClick={() => setEditandoId(user.aluno.id)}
                      >
                        ✅ Validar
                      </button>
                      <button
                        className="btn-rejeitar"
                        onClick={() => rejeitarCandidato(user.aluno.id)}
                        style={{
                          backgroundColor: "#dc3545",
                          color: "#fff",
                          border: "none",
                          padding: "8px 12px",
                          borderRadius: "4px",
                        }}
                      >
                        ❌ Rejeitar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-container" style={{ marginTop: "50px" }}>
        <h2>📊 Distribuição por Turma</h2>
        {turmasAlocadas.map((turma) => (
          <div key={turma.id} className="turma-section">
            <h3>
              {turma.nome} ({turma.vagas_ocupadas}/{turma.vagas})
            </h3>
            <table className="admin-table">
              <tbody>
                {turma.alunos?.map((aluno) => (
                  <tr key={aluno.id}>
                    <td>{aluno.nome}</td>
                    <td>{aluno.curso}</td>
                    <td>
                      {/* --- AQUI ESTÁ O BOTÃO ATUALIZADO --- */}
                      <button 
                        className="btn-remanejar"
                        onClick={() => abrirModalMover(aluno)}
                      >
                        🔄 Mover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </>
  );
};

export default GestaoMatriculas;