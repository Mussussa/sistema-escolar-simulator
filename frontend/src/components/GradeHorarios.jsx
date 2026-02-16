import { useState, useEffect } from "react";
import api from "../api/api";
import "../styler/horario.css";

const GradeHorarios = ({ turmas, professores }) => {
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [disciplinasDoCurso, setDisciplinasDoCurso] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState("");

  // --- ALTERAÇÃO 1: Estados Dinâmicos em vez de constantes fixas ---
  const [diasSemana, setDiasSemana] = useState([]);
  const [tempos, setTempos] = useState([]);
  const [regimeAtual, setRegimeAtual] = useState(""); // Para controlar a exibição visual

  const [editandoSlot, setEditandoSlot] = useState(null);
  const [dadosSlot, setDadosSlot] = useState({
    disciplinaId: "",
    professorId: "",
  });

  // --- ALTERAÇÃO 2: Lógica para definir os dias e tempos baseado no Regime/Turno ---
  const configurarGrade = (turmaObj) => {
    // Tenta pegar o regime do objeto curso (se o backend enviou no include) ou define padrão
    const regime = turmaObj.curso?.regime || "Laboral";
    const turno = turmaObj.turno || "Manhã";
    
    setRegimeAtual(regime);

    // Normaliza para evitar erros de maiúsculas/minúsculas
    const regimeNorm = regime.toLowerCase();
    const turnoNorm = turno.toLowerCase();

    if (regimeNorm.includes("semi") || regimeNorm.includes("sábado")) {
      // CONFIGURAÇÃO SEMI-PRESENCIAL
      setDiasSemana(["Sábado", "Domingo"]);
      setTempos([1, 2, 3, 4]); // Geralmente 4 blocos grandes
    } else {
      // CONFIGURAÇÃO REGULAR (Segunda a Sexta)
      setDiasSemana([
        "Segunda-feira",
        "Terça-feira",
        "Quarta-feira",
        "Quinta-feira",
        "Sexta-feira",
      ]);

      // Ajuste de tempos para o Noturno (Pós-Laboral costuma ter menos tempos)
      if (turnoNorm.includes("noite") || turnoNorm.includes("pós")) {
        setTempos([1, 2, 3, 4]);
      } else {
        setTempos([1, 2, 3, 4, 5, 6]);
      }
    }
  };

  useEffect(() => {
    if (!turmaSelecionada) return;

    const carregarDadosTurma = async () => {
      setLoading(true);
      try {
        const turmaObj = turmas.find((t) => t.id === turmaSelecionada);
        if (!turmaObj) return;

        // --- CHAMA A CONFIGURAÇÃO DINÂMICA AQUI ---
        configurarGrade(turmaObj);

        // Verificação de segurança
        if (!turmaObj.cursoId) {
          console.warn("A turma selecionada não possui um cursoId válido.");
          return;
        }

        const resDisc = await api.get(
          `/diretor/disciplinas?cursoId=${turmaObj.cursoId}`,
        );
        setDisciplinasDoCurso(resDisc.data || []);

        const resHorario = await api.get(
          `/diretor/horarios/${turmaSelecionada}`,
        );
        setHorarios(resHorario.data || []);
      } catch (err) {
        console.error("Erro ao carregar grade", err);
      } finally {
        setLoading(false);
      }
    };

    carregarDadosTurma();
  }, [turmaSelecionada, turmas]);

  const getAulasAlocadas = (disciplinaId) => {
    return horarios.filter((h) => h.disciplinaId === disciplinaId).length;
  };

  const handleAbrirEdicao = (dia, tempo) => {
    const aulaExistente = horarios.find(
      (h) => h.dia_semana === dia && h.ordem_tempo === tempo,
    );

    setEditandoSlot({ dia, tempo });

    if (aulaExistente) {
      setDadosSlot({
        disciplinaId: aulaExistente.disciplinaId || "",
        professorId: aulaExistente.professorId || "",
      });
    } else {
      setDadosSlot({ disciplinaId: "", professorId: "" });
    }
  };

  const getConteudoCelula = (dia, tempo) => {
    const aula = horarios.find(
      (h) => h.dia_semana === dia && h.ordem_tempo === tempo,
    );
    if (aula) {
      return (
        <div className="celula-cheia">
          <strong>{aula.disciplina?.nome}</strong>
          <small>{aula.professor?.nome}</small>
          <span className="hora-tag">{aula.hora_inicio?.substring(0, 5)}</span>
        </div>
      );
    }
    return <span className="celula-vazia">+ Adicionar</span>;
  };

const handleSalvarSlot = async () => {
    setMensagem("");

    // NÃO precisamos mais converter para número. O banco quer o texto.
    const diaTexto = editandoSlot.dia; // Ex: "Segunda-feira"

    const turmaObj = turmas.find((t) => t.id === turmaSelecionada);
    const disciplinaAlvo = disciplinasDoCurso.find((d) => d.id === dadosSlot.disciplinaId);

    // --- Validação de Carga Horária (Mantida) ---
    if (disciplinaAlvo) {
      const usadas = getAulasAlocadas(disciplinaAlvo.id);
      const aulaExistenteNestaCelula = horarios.find(
        (h) => h.dia_semana === diaTexto && h.ordem_tempo === editandoSlot.tempo,
      );

      let contagemReal =
        aulaExistenteNestaCelula &&
        aulaExistenteNestaCelula.disciplinaId === disciplinaAlvo.id
          ? usadas
          : usadas + 1;

      if (contagemReal > disciplinaAlvo.carga_horaria) {
        setMensagem(`⚠️ Limite de ${disciplinaAlvo.carga_horaria}h excedido.`);
        setTimeout(() => setMensagem(""), 3000);
        return;
      }
    }

    try {
      const payload = {
        turmaId: turmaSelecionada,
        dia_semana: diaTexto, // ENVIA "Segunda-feira" DIRETAMENTE
        ordem_tempo: Number(editandoSlot.tempo),
        periodo: turmaObj?.turno || "Manhã",
        disciplinaId: dadosSlot.disciplinaId || null,
        professorId: dadosSlot.professorId || null,
      };

      const res = await api.post("/diretor/horarios", payload);
      const horarioSalvo = res.data.horario;

      setHorarios((prev) => [
        ...prev.filter(
          (h) =>
            !(
              h.dia_semana === diaTexto && 
              h.ordem_tempo === payload.ordem_tempo
            ),
        ),
        horarioSalvo,
      ]);

      setMensagem("✅ Salvo com sucesso!");
      setTimeout(() => setMensagem(""), 3000);
      setEditandoSlot(null);
      setDadosSlot({ disciplinaId: "", professorId: "" });
      
    } catch (err) {
      console.error("Erro no save:", err);
      setMensagem("❌ " + (err.response?.data?.erro || "Erro ao salvar."));
    }
  };
  return (
    <div className="grade-container">
      <h3>📅 Montar Grade de Horários</h3>

      <div className="filtros-grade">
        <label>Selecione a Turma:</label>
        <select
          value={turmaSelecionada}
          onChange={(e) => setTurmaSelecionada(e.target.value)}
        >
          <option value="">-- Selecione --</option>
          {turmas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome} ({t.turno}) - {t.curso?.regime || "Laboral"}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>Carregando grade...</p>}
      {mensagem && <div className="alerta-flutuante">{mensagem}</div>}

      {turmaSelecionada && !loading && (
        <div className="tabela-scroll">
          <table className="tabela-horario">
            <thead>
              <tr>
                <th>Tempo</th>
                {diasSemana.map((dia) => (
                  <th key={dia}>{dia}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tempos.map((tempo) => (
                <tr key={tempo}>
                  {/* --- ALTERAÇÃO 3: Visualização Condicional do Label de Tempo --- */}
                  <td className="tempo-label">
                    {regimeAtual.toLowerCase().includes("semi") ? (
                       <div className="bloco-info">
                         <strong>Bloco {tempo}</strong>
                         <small style={{display: 'block', fontSize: '11px', color: '#666', marginTop: '4px'}}>
                           {tempo === 1 ? "08:00 - 10:00" :
                            tempo === 2 ? "10:15 - 12:15" :
                            tempo === 3 ? "13:00 - 15:00" : "15:15 - 17:15"}
                         </small>
                       </div>
                    ) : (
                       <strong>{tempo}º Tempo</strong>
                    )}
                  </td>
                  
                  {diasSemana.map((dia) => (
                    <td
                      key={`${dia}-${tempo}`}
                      className="celula-interativa"
                      onClick={() => handleAbrirEdicao(dia, tempo)}
                    >
                      {getConteudoCelula(dia, tempo)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editandoSlot && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4>
              {editandoSlot.dia} - {editandoSlot.tempo}º Tempo
            </h4>

            <label>Disciplina:</label>
            <select
              value={dadosSlot.disciplinaId}
              onChange={(e) =>
                setDadosSlot({ ...dadosSlot, disciplinaId: e.target.value })
              }
            >
              <option value="">Selecione...</option>
              {disciplinasDoCurso.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome} ({getAulasAlocadas(d.id)}/{d.carga_horaria}h)
                </option>
              ))}
            </select>

            <label>Professor:</label>
            <select
              value={dadosSlot.professorId}
              onChange={(e) =>
                setDadosSlot({ ...dadosSlot, professorId: e.target.value })
              }
            >
              <option value="">Selecione...</option>
              {professores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>

            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setEditandoSlot(null)}
              >
                Cancelar
              </button>
              <button className="btn-save" onClick={handleSalvarSlot}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradeHorarios;