import { useState, useEffect } from "react";
import api from "../api/api";
import "../styler/Configuracoes.css";

const Configuracoes = () => {
  const [config, setConfig] = useState({
    nome_instituicao: "",
    tipo_ensino: "Secundário",
    quantidade_avaliacoes_trimestre: 3,
    media_aprovacao: 10,
    tem_exame_final: false,
    limite_faltas_trimestre: 15,
    dias_inatividade_desistente: 30,
    moeda: "MT",
    cursos: [],
  });

  const [novoCursoNome, setNovoCursoNome] = useState("");
  // Estado para controlar os inputs de turma dentro de cada curso
  const [inputTurma, setInputTurma] = useState({});

  const [mensagem, setMensagem] = useState({ tipo: "", texto: "" });
  const [carregando, setCarregando] = useState(true);
  const [novoCursoRegime, setNovoCursoRegime] = useState("Normal");

  useEffect(() => {
    const carregarConfig = async () => {
      try {
        const res = await api.get("/configuracoes");
        if (res.data) {
          // Garantimos que cada curso venha com um array de turmas
          const cursosTratados = (res.data.cursos || []).map((c) => ({
            ...c,
            turmas: c.turmas || [],
          }));
          setConfig({ ...res.data, cursos: cursosTratados });
        }
      } catch (err) {
        console.error("Erro ao carregar", err);
      } finally {
        setCarregando(false);
      }
    };
    carregarConfig();
  }, []);

  // --- LÓGICA DE CURSOS ---
  const adicionarCurso = () => {
    const nome = novoCursoNome.trim();
    if (!nome) return;
    if (
      config.cursos.some((c) => c.nome.toLowerCase() === nome.toLowerCase())
    ) {
      setMensagem({ tipo: "erro", texto: "Este curso já existe." });
      return;
    }
    setConfig({
      ...config,
      cursos: [...config.cursos, { nome, regime: novoCursoRegime, turmas: [] }],
    });
    setNovoCursoNome("");
  };

  const removerCurso = (index) => {
    const novos = config.cursos.filter((_, i) => i !== index);
    setConfig({ ...config, cursos: novos });
  };

  // --- LÓGICA DE TURMAS VINCULADAS ---
  const handleInputTurma = (cursoIdx, campo, valor) => {
    setInputTurma((prev) => ({
      ...prev,
      [cursoIdx]: { ...prev[cursoIdx], [campo]: valor },
    }));
  };

  const adicionarTurmaAoCurso = (cursoIdx) => {
    const dados = inputTurma[cursoIdx] || {};
    const nomeT = (dados.nome || "").trim();
    if (!nomeT) return;

    const novosCursos = [...config.cursos];
    novosCursos[cursoIdx].turmas.push({
      nome: nomeT,
      turno: dados.turno || "Manhã",
      vagas: Number(dados.vagas || 40),
    });

    setConfig({ ...config, cursos: novosCursos });
    setInputTurma((prev) => ({
      ...prev,
      [cursoIdx]: { ...prev[cursoIdx], nome: "" },
    }));
  };

  const removerTurmaDoCurso = (cursoIdx, turmaIdx) => {
    const novosCursos = [...config.cursos];
    novosCursos[cursoIdx].turmas = novosCursos[cursoIdx].turmas.filter(
      (_, i) => i !== turmaIdx,
    );
    setConfig({ ...config, cursos: novosCursos });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/configuracoes", config);
      setMensagem({
        tipo: "sucesso",
        texto: "Estrutura escolar salva com sucesso!",
      });
      setTimeout(() => setMensagem({ tipo: "", texto: "" }), 3000);
    } catch (err) {
      setMensagem({ tipo: "erro", texto: "Falha ao salvar." });
    }
  };

  if (carregando) return <div className="loading">Carregando...</div>;

  return (
    <div className="config-wrapper">
      <div className="config-header">
        <h1>⚙️ Configuração de Cursos e Turmas</h1>
        <button onClick={handleSubmit} className="btn-salvar-topo">
          💾 Salvar Estrutura
        </button>
      </div>

      {mensagem.texto && (
        <div className={`alerta ${mensagem.tipo}`}>{mensagem.texto}</div>
      )}

      <form onSubmit={handleSubmit} className="config-grid">
        {/* Identidade */}
        <section className="config-card">
          <h2>🏢 Instituição</h2>
          <div className="input-group">
            <label>Nome</label>
            <input
              type="text"
              className="input-field"
              value={config.nome_instituicao}
              onChange={(e) =>
                setConfig({ ...config, nome_instituicao: e.target.value })
              }
            />
          </div>
        </section>

        {/* Gestão de Cursos e Turmas */}
        <section className="config-card span-row">
          <h2>📚 Estrutura de Cursos e Turmas</h2>

          <div className="add-curso-box">
            <input
              type="text"
              placeholder="Nome do Curso"
              value={novoCursoNome}
              onChange={(e) => setNovoCursoNome(e.target.value)}
            />
            <select
              value={novoCursoRegime}
              onChange={(e) => setNovoCursoRegime(e.target.value)}
            >
              <option value="Normal">Regime Normal</option>
              <option value="Semi-presencial">Semi-presencial</option>
            </select>
            <button type="button" onClick={adicionarCurso}>
              + Criar Curso
            </button>
          </div>

          <div className="cursos-container">
            {config.cursos.map((curso, cIdx) => (
              <div key={cIdx} className="curso-item-card">
                <div className="curso-header">
                  <h3>
                    {curso.nome} <small>({curso.regime})</small>
                  </h3>
                  <button
                    type="button"
                    onClick={() => removerCurso(cIdx)}
                    className="btn-del"
                  >
                    Remover Curso
                  </button>
                </div>

                <div className="turmas-section">
                  <div className="turmas-list">
                    {curso.turmas.map((t, tIdx) => (
                      <div key={tIdx} className="turma-tag">
                        <span>
                          {t.nome} ({t.turno}) - {t.vagas} vagas
                        </span>
                        <button
                          type="button"
                          onClick={() => removerTurmaDoCurso(cIdx, tIdx)}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="add-turma-form">
                    <input
                      type="text"
                      placeholder="Cód. Turma"
                      value={inputTurma[cIdx]?.nome || ""}
                      onChange={(e) =>
                        handleInputTurma(cIdx, "nome", e.target.value)
                      }
                    />
                    <select
                      onChange={(e) =>
                        handleInputTurma(cIdx, "turno", e.target.value)
                      }
                    >
                      <option value="Manhã">Manhã</option>
                      <option value="Tarde">Tarde</option>
                      <option value="Noite">Noite</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Vagas"
                      className="w-50"
                      onChange={(e) =>
                        handleInputTurma(cIdx, "vagas", e.target.value)
                      }
                    />
                    <button
                      type="button"
                      onClick={() => adicionarTurmaAoCurso(cIdx)}
                    >
                      Add Turma
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </form>
    </div>
  );
};

export default Configuracoes;
