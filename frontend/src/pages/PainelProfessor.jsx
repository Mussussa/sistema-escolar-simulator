import { useState, useEffect, useRef, Fragment } from "react";
import api from "../api/api";
import "../styler/professor.css";

// Importação do componente de notas (certifique-se que o caminho está certo)
import PainelNotas from "../components/PainelNotas";

// Importação dos ícones
import {
  FaArrowLeft,
  FaUserCheck,
  FaGraduationCap,
  FaClock,
  FaChalkboardTeacher,
  FaHistory,
  FaSearch,
  FaCheckCircle,
} from "react-icons/fa";

const PainelProfessor = ({ professorId }) => {
  // --- ESTADOS DE AUTENTICAÇÃO ---
  const [precisaTrocarSenha, setPrecisaTrocarSenha] = useState(() => {
    const user = JSON.parse(localStorage.getItem("usuario"));
    return user?.deve_alterar_senha === true;
  });

  // --- ESTADOS DE DADOS ---
  const [meuHorario, setMeuHorario] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [selecao, setSelecao] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState("horario");
  const [loading, setLoading] = useState(false);

  // --- ESTADOS PARA JUSTIFICATIVA RETROATIVA ---
  const [dataFiltro, setDataFiltro] = useState("");
  const [faltasEncontradas, setFaltasEncontradas] = useState([]);
  const [motivos, setMotivos] = useState({});

  // --- CONFIGURAÇÃO DINÂMICA DO HORÁRIO ---
  const [estruturaVisual, setEstruturaVisual] = useState([
    { turno: "Manhã", tempos: [1, 2, 3, 4, 5, 6] },
    { turno: "Tarde", tempos: [1, 2, 3, 4, 5, 6] },
    { turno: "Noite", tempos: [1, 2, 3, 4 , 5 , 6] },
  ]);

  const [diasVisiveis, setDiasVisiveis] = useState([
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
  ]);

  useEffect(() => {
    const carregarHorario = async () => {
      try {
        const res = await api.get(`/professor/horarios/${professorId}`);
        const dados = res.data;
        setMeuHorario(dados);

        // --- LÓGICA INTELIGENTE: Detetar Semi-Presencial ---
        const temFimDeSemana = dados.some(
          (aula) => aula.dia_semana === "Sábado" || aula.dia_semana === "Domingo"
        );

        if (temFimDeSemana) {
          // 1. Adiciona Sábado e Domingo nas colunas
          setDiasVisiveis([
            "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"
          ]);

          // 2. Adiciona o Bloco de Horário Semi-Presencial se ainda não existir
          setEstruturaVisual((prev) => {
            if (prev.find((p) => p.turno === "Semi-Presencial")) return prev;
            return [
              ...prev,
              { turno: "Semi-Presencial", tempos: [1, 2, 3, 4] }, // Blocos típicos de sábado
            ];
          });
        }
      } catch (err) {
        console.error("Erro ao carregar horários", err);
      }
    };
    if (professorId && !precisaTrocarSenha) carregarHorario();
  }, [professorId, precisaTrocarSenha]);

  // --- LÓGICA DE BUSCA RETROATIVA ---
  const buscarFaltasRetroativas = async () => {
    if (!dataFiltro) return alert("Selecione uma data para buscar.");
    setLoading(true);
    try {
      const res = await api.get("/professor/presencas/faltas-por-data", {
        params: {
          data: dataFiltro,
          disciplinaId: selecao.disciplinaId,
        },
      });
      setFaltasEncontradas(res.data);
    } catch (err) {
      console.error(err);
      alert("Erro ao buscar faltas.");
    } finally {
      setLoading(false);
    }
  };

  const handleJustificar = async (falta) => {
    const texto = motivos[falta.id];
    if (!texto) return alert("Digite o motivo.");

    try {
      setLoading(true);
      await api.put(`/professor/presencas/justificar`, {
        alunoId: falta.alunoId,
        disciplinaId: selecao.disciplinaId,
        data: dataFiltro,
        justificativa: texto,
      });

      alert("Justificado!");
      setFaltasEncontradas(faltasEncontradas.filter((f) => f.id !== falta.id));
    } catch (err) {
      alert("Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  const abrirDiario = async (aula) => {
    setLoading(true);
    try {
      setSelecao({
        turmaId: aula.turmaId,
        disciplinaId: aula.disciplinaId,
        turmaNome: aula.turma.nome,
        discNome: aula.disciplina.nome,
        horarioId: aula.id,
      });
      const res = await api.get(`/professor/turma/${aula.turmaId}/alunos`);
      setAlunos(
        res.data.map((a) => ({ ...a, status: "P", justificativa: "" }))
      );
      setAbaAtiva("faltas");
    } catch (err) {
      alert("Erro ao carregar dados da turma.");
    } finally {
      setLoading(false);
    }
  };

  const voltarAoHorario = () => {
    setSelecao(null);
    setAbaAtiva("horario");
    setFaltasEncontradas([]);
    setDataFiltro("");
  };

const salvarChamada = async () => {
    //setLoading(true);
    
    // Pegar o ID do usuário logado (Professor) do localStorage
    const usuarioLogado = JSON.parse(localStorage.getItem("usuario"));
    
    if (!selecao?.horarioId) {
      alert("Erro: Horário não identificado.");
      setLoading(false);
      return;
    }

    try {
      const payload = alunos.map((a) => ({
        alunoId: a.id,
        disciplinaId: selecao.disciplinaId,
        
        // NOVOS CAMPOS OBRIGATÓRIOS
        horarioId: selecao.horarioId, 
        usuarioId: usuarioLogado.id, 

        status: a.status || "P",
        justificativa: a.status === "FJ" ? a.justificativa : null,
        data: new Date().toISOString().split("T")[0],
      }));

      console.log("Enviando Presenças:", payload); // Para Debug

      await api.post("/professor/presencas", { presencas: payload });
      alert("Chamada salva com sucesso!");
    } catch (err) {
      console.error(err.response?.data); // Veja o erro exato no console
      alert("Erro ao salvar chamada: " + (err.response?.data?.erro || "Erro desconhecido"));
    } finally {
      setLoading(false);
    }
  };

  const getHorarioString = (turno, tempo) => {
    const h = {
      Manhã: [
        "07:00-07:45", "07:45-08:30", "08:30-09:15", "09:15-10:00", "10:15-11:00", "11:00-11:45",
      ],
      Tarde: [
        "12:30-13:15", "13:15-14:00", "14:00-14:45", "14:45-15:30", "15:45-16:30", "16:30-17:15",
      ],
      Noite: ["18:00-18:45", "18:45-19:30", "19:30-20:15", "20:15-21:00"],
      // Adicionado horário Semi-Presencial
      "Semi-Presencial": ["08:00-10:00", "10:15-12:15", "13:00-15:00", "15:15-17:15"],
    };
    return h[turno]?.[tempo - 1] || "";
  };

  if (precisaTrocarSenha) {
    return null; // O App.js deve lidar com o redirecionamento
  }

  return (
    <div className="professor-dashboard">
      <header className="dash-header">
        <div className="header-main">
          <h2>
            <FaChalkboardTeacher /> Painel do Professor
          </h2>
        </div>

  {selecao && (
    <div className="info-selecao card-animado">
      <div className="selecao-detalhes">
        <span>
          <strong>Turma:</strong> {selecao.turmaNome}
        </span>
        <span>
          <strong style={{
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            wordBreak: 'break-word',
            whiteSpace: 'normal',
          }}>Disciplina:</strong> {selecao.discNome}
        </span>
      </div>
      <button onClick={voltarAoHorario} className="btn-voltar">
        <FaArrowLeft /> Voltar
      </button>
    </div>
  )}
      </header>

      {!selecao ? (
        <div className="grid-horarios card-base">
          {/* Adicionei overflow-x: auto no CSS .table-responsive para celular */}
          <div className="table-responsive">
            <table className="tabela-horario">
              <thead>
                <tr>
                  <th>
                    <FaClock /> Horário
                  </th>
                  {diasVisiveis.map((dia) => (
                    <th key={dia}>{dia}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {estruturaVisual.map((bloco) => (
                  <Fragment key={bloco.turno}>
                    <tr className="linha-turno">
                      <td colSpan={diasVisiveis.length + 1} style={{ fontWeight: "bold", background: "#f0f2f5" }}>
                        {bloco.turno}
                      </td>
                    </tr>
                    {bloco.tempos.map((tempo) => (
                      <tr key={`${bloco.turno}-${tempo}`}>
                        <td className="tempo-label">
                          <strong>{tempo}º</strong>
                          <br />
                          <small style={{ fontSize: "0.75rem", color: "#666" }}>
                            {getHorarioString(bloco.turno, tempo)}
                          </small>
                        </td>
                        {diasVisiveis.map((dia) => {
                          // LÓGICA DE FILTRO DA CÉLULA
                          const aula = meuHorario.find((h) => {
                            // 1. Verifica Dia e Tempo
                            const matchDiaTempo = h.dia_semana === dia && h.ordem_tempo === tempo;
                            if (!matchDiaTempo) return false;

                            // 2. Verifica Turno/Regime
                            // Se for bloco Normal (Manhã/Tarde/Noite), o turno da turma deve bater
                            if (bloco.turno !== "Semi-Presencial") {
                              return h.turma?.turno === bloco.turno;
                            }
                            // Se for bloco Semi-Presencial, aceitamos aulas de Sábado/Domingo
                            // independente do que diz o 'turno' no banco (geralmente cadastrado como Manhã)
                            return dia === "Sábado" || dia === "Domingo";
                          });

                          return (
                            <td
                              key={dia}
                              className={aula ? "celula-aula" : "celula-vazia"}
                              onClick={() => aula && abrirDiario(aula)}
                              style={{ cursor: aula ? "pointer" : "default" }}
                            >
                              {aula ? (
                                <div className="aula-item">
                                  <strong>{aula.disciplina.nome}</strong>
                                  <span>{aula.turma.nome}</span>
                                </div>
                              ) : (
                                "-"
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ... CONTEÚDO DO DIÁRIO (MANTIDO IGUAL) ... */
        <div className="diario-content card-base">
          <nav className="abas-diario">
            <button
              className={abaAtiva === "faltas" ? "active" : ""}
              onClick={() => setAbaAtiva("faltas")}
            >
              <FaUserCheck /> Chamada
            </button>
            <button
              className={abaAtiva === "notas" ? "active" : ""}
              onClick={() => setAbaAtiva("notas")}
            >
              <FaGraduationCap /> Pauta de Notas
            </button>
            <button
              className={abaAtiva === "retroativo" ? "active" : ""}
              onClick={() => setAbaAtiva("retroativo")}
            >
              <FaHistory /> Justificar Antigas
            </button>
          </nav>

          {abaAtiva === "faltas" && (
            <div className="chamada-section">
              <div className="table-responsive">
                <table className="tabela-alunos">
                  <thead>
                    <tr>
                      <th>Nº</th>
                      <th>Nome</th>
                      <th>Presença</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alunos.map((aluno, idx) => (
                      <tr key={aluno.id}>
                        <td>{idx + 1}</td>
                        <td>{aluno.nome}</td>
                        <td>
                          <div className="status-selector">
                            <button
                              className={
                                aluno.status === "P" ? "btn-p active" : "btn-p"
                              }
                              onClick={() => {
                                const n = [...alunos];
                                n[idx].status = "P";
                                setAlunos(n);
                              }}
                            >
                              P
                            </button>
                            <button
                              className={
                                aluno.status === "F" ? "btn-f active" : "btn-f"
                              }
                              onClick={() => {
                                const n = [...alunos];
                                n[idx].status = "F";
                                setAlunos(n);
                              }}
                            >
                              F
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={salvarChamada}
                className="btn-save-all"
                disabled={loading}
              >
                <FaCheckCircle /> {loading ? "Salvando..." : "Salvar Chamada"}
              </button>
            </div>
          )}

          {abaAtiva === "notas" && (
            <div className="notas-section">
              <PainelNotas
                turmaId={selecao.turmaId}
                disciplinaId={selecao.disciplinaId}
              />
            </div>
          )}

          {abaAtiva === "retroativo" && (
            <div className="retroativo-section">
              <div
                className="busca-retroativa"
                style={{
                  marginBottom: "20px",
                  display: "flex",
                  gap: "10px",
                  alignItems: "flex-end",
                }}
              >
                <div className="input-group" style={{ textAlign: "left" }}>
                  <label>Data da Falta:</label>
                  <input
                    type="date"
                    value={dataFiltro}
                    onChange={(e) => setDataFiltro(e.target.value)}
                    style={{
                      padding: "8px",
                      borderRadius: "5px",
                      border: "1px solid #ccc",
                    }}
                  />
                </div>
                <button
                  className="btn-save-all"
                  onClick={buscarFaltasRetroativas}
                  disabled={loading}
                  style={{ marginTop: 0 }}
                >
                  <FaSearch /> {loading ? "Buscando..." : "Ver Faltas"}
                </button>
              </div>

              <div className="table-responsive">
                <table className="tabela-alunos">
                  <thead>
                    <tr>
                      <th>Nome do Aluno</th>
                      <th>Status Atual</th>
                      <th>Justificativa (Motivo)</th>
                      <th>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faltasEncontradas.length > 0 ? (
                      faltasEncontradas.map((falta) => (
                        <tr key={falta.id}>
                          <td>{falta.aluno?.nome}</td>
                          <td>
                            <span style={{ color: "red", fontWeight: "bold" }}>
                              FALTA
                            </span>
                          </td>
                          <td>
                            <input
                              type="text"
                              placeholder="Ex: Atestado Médico"
                              value={motivos[falta.id] || ""}
                              onChange={(e) =>
                                setMotivos({
                                  ...motivos,
                                  [falta.id]: e.target.value,
                                })
                              }
                              style={{ width: "100%", padding: "5px" }}
                            />
                          </td>
                          <td>
                            <button
                              onClick={() => handleJustificar(falta)}
                              className="btn-p active"
                              style={{ padding: "5px 15px" }}
                            >
                              Gravar
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4">
                          Nenhuma falta pendente encontrada para esta data.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PainelProfessor;