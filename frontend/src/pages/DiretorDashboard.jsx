import { useState, useEffect } from "react";
import api from "../api/api";
import "../styler/Diretor.css";
import GradeHorarios from "../components/GradeHorarios";

// Importando os ícones
import {
  FaBook,
  FaChalkboardTeacher,
  FaPlus,
  FaSave,
  FaTrashAlt,
  FaUserPlus,
  FaBullhorn,
  FaTimes,
  FaCheckCircle,
  FaFileUpload,
} from "react-icons/fa";

const DiretorDashboard = () => {
  const [cursos, setCursos] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [listaProfessores, setListaProfessores] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [mensagem, setMensagem] = useState("");
  const [usuariosPendentes, setUsuariosPendentes] = useState([]);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState("");
  const [professorAlvoId, setProfessorAlvoId] = useState("");

  const [cursoSelecionadoParaDisc, setCursoSelecionadoParaDisc] = useState("");

  const [novaDisciplina, setNovaDisciplina] = useState({
    nome: "",
    carga_horaria: "",
    aulas_planejadas: "",
    tipo: "Geral",
    vocacional: "3",
  });

  const [formProfessor, setFormProfessor] = useState({
    nome: "",
    email: "",
    telefone: "",
    especialidade: "",
    nivel_academico: "",
    estado: "Ativo",
    bi: "",
  });

  const [avisos, setAvisos] = useState([]);
  const [novoAviso, setNovoAviso] = useState({
    titulo: "",
    conteudo: "",
    prioridade: "normal",
  });

  const buscarAvisos = async () => {
    const res = await api.get("/diretor/avisos");
    setAvisos(res.data);
  };

  const handlePostarAviso = async (e) => {
    e.preventDefault();
    try {
      await api.post("/diretor/avisos", novoAviso);
      setMensagem("📢 Aviso publicado!");
      setNovoAviso({ titulo: "", conteudo: "", prioridade: "normal" });
      buscarAvisos();
    } catch (err) {
      setMensagem("Erro ao publicar aviso.");
    }
  };

  const handleRemoverAviso = async (id) => {
    if (!window.confirm("Deseja apagar este aviso?")) return;
    await api.delete(`/diretor/avisos/${id}`);
    buscarAvisos();
  };

  useEffect(() => {
    const buscarDadosIniciais = async () => {
      try {
        const [resCursos, resProfs, resTurmas, resPendentes] =
          await Promise.all([
            api.get("/diretor/cursos"),
            api.get("/diretor/professores"),
            api.get("/diretor/turmas"),
            api.get("/diretor/usuarios-pendentes"),
          ]);

        setCursos(resCursos.data || []);
        setListaProfessores(resProfs.data || []);
        setTurmas(resTurmas.data || []);
        setUsuariosPendentes(resPendentes.data || []);
        buscarAvisos(); // Chama a busca de avisos inicial
      } catch (err) {
        console.error("Erro ao carregar dados", err);
      }
    };
    buscarDadosIniciais();
  }, []);

  useEffect(() => {
    const carregarDisciplinasDoCurso = async () => {
      if (!cursoSelecionadoParaDisc) {
        setDisciplinas([]);
        return;
      }
      try {
        const res = await api.get(
          `/diretor/disciplinas?cursoId=${cursoSelecionadoParaDisc}`,
        );
        setDisciplinas(res.data || []);
      } catch (err) {
        console.error("Erro ao carregar disciplinas do curso");
      }
    };
    carregarDisciplinasDoCurso();
  }, [cursoSelecionadoParaDisc]);

  const adicionarDisciplinaLocal = () => {
    if (!novaDisciplina.nome || !novaDisciplina.carga_horaria) return;
    setDisciplinas([...disciplinas, { ...novaDisciplina }]);
    setNovaDisciplina({ nome: "", carga_horaria: "", tipo: "Geral" });
  };

  const removerDisciplinaLocal = (index) => {
    setDisciplinas(disciplinas.filter((_, i) => i !== index));
  };

const handleSalvarDisciplinas = async () => {
    if (!cursoSelecionadoParaDisc) {
      setMensagem("⚠️ Por favor, selecione um curso primeiro!");
      return;
    }

    // --- CORREÇÃO AQUI ---
    // Criamos uma lista "limpa", removendo campos que o Joi não aceita (como configuracaoId)
    const disciplinasParaEnviar = disciplinas.map((d) => ({
      id: d.id || null, // Mantém ID se existir, ou null se for nova
      nome: d.nome,
      carga_horaria: Number(d.carga_horaria),
      aulas_planejadas: Number(d.aulas_planejadas),
      tipo: d.tipo,
      vocacional: String(d.vocacional),
      // Nota: Não incluímos 'configuracaoId', 'createdAt', etc.
    }));

    try {
      const res = await api.post("/diretor/disciplinas", {
        cursoId: cursoSelecionadoParaDisc,
        disciplinas: disciplinasParaEnviar, // Enviamos a lista limpa
      });
      
      setMensagem(res.data.mensagem || "Disciplinas sincronizadas!");
      // Atualizamos o estado com o que voltou do servidor (que agora tem IDs reais)
      setDisciplinas(res.data.disciplinas);
    } catch (err) {
      console.error("Erro no envio:", err.response?.data);
      setMensagem("Erro: " + (err.response?.data?.erro || err.message));
    }
  };
  const handleInscricaoProfessor = async (e) => {
    e.preventDefault();

    // 1. Validação de Telefone (conforme o seu Backend espera)
    const telefoneLimpo = formProfessor.telefone.replace(/\D/g, "");
    if (telefoneLimpo.length < 9) {
      setMensagem("⚠️ O telefone deve ter pelo menos 9 dígitos.");
      return;
    }

    // 2. Criação do FormData (Essencial para envio de arquivos)
    const formData = new FormData();

    // Garantimos que os nomes das chaves são IDÊNTICOS ao que o Joi espera no Backend
    formData.append("nome", formProfessor.nome.trim());
    formData.append("email", formProfessor.email.toLowerCase().trim());
    formData.append("telefone", telefoneLimpo);
    formData.append("especialidade", formProfessor.especialidade.trim());
    formData.append("nivel_academico", formProfessor.nivel_academico);

    // O Multer espera a chave 'bi'
    if (formProfessor.arquivoBI) {
      formData.append("bi", formProfessor.arquivoBI);
    } else {
      setMensagem("⚠️ O arquivo BI é obrigatório.");
      return;
    }

    try {
      // IMPORTANTE: Não envie o objeto como JSON, envie o formData diretamente
      const res = await api.post("/diretor/professores", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setMensagem("✅ " + res.data.mensagem);

      // Atualizar lista e limpar form
      const resProfs = await api.get("/diretor/professores");
      setListaProfessores(resProfs.data || []);

      // Resetar o formulário
      setFormProfessor({
        nome: "",
        email: "",
        telefone: "",
        especialidade: "",
        nivel_academico: "",
        estado: "Ativo",
        arquivoBI: null,
      });
    } catch (err) {
      // Captura a mensagem de erro vinda do Joi no Backend
      const msgErro =
        err.response?.data?.erro || "Erro ao cadastrar professor.";
      setMensagem("❌ " + msgErro);
    }
  };

  const handleDeletarProfessor = async (id) => {
    if (window.confirm("Remover este professor?")) {
      try {
        await api.delete(`/diretor/professores/${id}`);
        setListaProfessores((prev) => prev.filter((p) => p.id !== id));
        setMensagem("🗑️ Professor removido!");
      } catch (err) {
        setMensagem("Erro ao deletar.");
      }
    }
  };

  const handleVincularProfessor = async () => {
    if (!usuarioSelecionado || !professorAlvoId) {
      setMensagem("⚠️ Selecione os dados necessários!");
      return;
    }
    try {
      await api.post("/diretor/aprovar-professor", {
        usuarioId: usuarioSelecionado,
        professorId: professorAlvoId,
      });
      setMensagem("✅ Usuário aprovado!");
      setUsuariosPendentes((prev) =>
        prev.filter((u) => u.id !== usuarioSelecionado),
      );
      setUsuarioSelecionado("");
      setProfessorAlvoId("");
    } catch (err) {
      setMensagem("❌ Erro ao aprovar.");
    }
  };

  return (
    <div className="diretor-container">
      {mensagem && <div className="alerta">{mensagem}</div>}

      <section className="secao-dashboard">
        <h2>
          <FaBook /> Gestão de Disciplinas por Curso
        </h2>

        <div className="form-group" style={{ marginBottom: "20px" }}>
          <label>1º Selecione o Curso:</label>
          <select
            value={cursoSelecionadoParaDisc}
            onChange={(e) => setCursoSelecionadoParaDisc(e.target.value)}
          >
            <option value="">Escolher curso para gerir disciplinas...</option>
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} ({c.regime})
              </option>
            ))}
          </select>
        </div>

        <div className="form-inline">
          <input
            type="text"
            placeholder="Nome da Disciplina"
            value={novaDisciplina.nome}
            onChange={(e) =>
              setNovaDisciplina({ ...novaDisciplina, nome: e.target.value })
            }
          />
          <input
            type="number"
            placeholder="Carga Horária (h)"
            value={novaDisciplina.carga_horaria}
            onChange={(e) =>
              setNovaDisciplina({
                ...novaDisciplina,
                carga_horaria: e.target.value,
              })
            }
          />
          {/* NOVO CAMPO ABAIXO */}
          <input
            type="number"
            placeholder="Total de Aulas/Trimestre"
            title="Necessário para cálculo de faltas (50%)"
            value={novaDisciplina.aulas_planejadas}
            onChange={(e) =>
              setNovaDisciplina({
                ...novaDisciplina,
                aulas_planejadas: e.target.value,
              })
            }
          />
          <select
            value={novaDisciplina.vocacional}
            onChange={(e) =>
              setNovaDisciplina({
                ...novaDisciplina,
                vocacional: e.target.value,
              })
            }
            title="Nível Vocacional"
          >
            <option value="3">CV3</option>
            <option value="4">CV4</option>
            <option value="5">CV5</option>
          </select>
          <select
            value={novaDisciplina.tipo}
            onChange={(e) =>
              setNovaDisciplina({ ...novaDisciplina, tipo: e.target.value })
            }
          >
            <option value="Geral">Geral</option>
            <option value="Técnica">Técnica</option>
          </select>
          <button
            type="button"
            onClick={adicionarDisciplinaLocal}
            disabled={!cursoSelecionadoParaDisc}
          >
            <FaPlus /> Add
          </button>
        </div>

        <ul className="lista-items-temp">
          {disciplinas.map((d, index) => (
            <li key={index} className="item-temp">
              <strong>CV{d.vocacional}</strong> - {d.nome} - {d.carga_horaria}h
              | <strong>{d.aulas_planejadas} aulas</strong> ({d.tipo})
              <button
                className="btn-remove-small"
                onClick={() => removerDisciplinaLocal(index)}
              >
                <FaTimes />
              </button>
            </li>
          ))}
        </ul>
        <button
          className="btn-primary"
          onClick={handleSalvarDisciplinas}
          disabled={!cursoSelecionadoParaDisc}
        >
          <FaSave /> Salvar Disciplinas deste Curso
        </button>
      </section>

      <hr />

      <section className="secao-dashboard">
        <h2>
          <FaUserPlus /> Inscrever Professor
        </h2>
        <form onSubmit={handleInscricaoProfessor}>
          <div className="form-group">
            <label>Nome:</label>
            <input
              type="text"
              required
              onChange={(e) =>
                setFormProfessor({ ...formProfessor, nome: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label>Telefone (ex: 841234567):</label>
            <input
              type="tel"
              maxLength="9"
              placeholder="841234567"
              value={formProfessor.telefone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setFormProfessor({ ...formProfessor, telefone: val });
              }}
              required
            />
          </div>
          <div className="form-group">
            <label>Especialidade:</label>
            <input
              type="text"
              required
              onChange={(e) =>
                setFormProfessor({
                  ...formProfessor,
                  especialidade: e.target.value,
                })
              }
            />
          </div>
          <div className="form-group">
            <label>Nível Académico:</label>
            <select
              required
              onChange={(e) =>
                setFormProfessor({
                  ...formProfessor,
                  nivel_academico: e.target.value,
                })
              }
            >
              <option value="">Selecione...</option>
              <option value="Médio">Técnico Médio</option>
              <option value="Licenciatura">Licenciatura</option>
            </select>
          </div>
          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              value={formProfessor.email}
              required
              onChange={(e) =>
                setFormProfessor({ ...formProfessor, email: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label>
              <FaFileUpload /> BI (PDF):
            </label>
            <input
              type="file"
              accept="application/pdf"
              required
              onChange={(e) =>
                setFormProfessor({
                  ...formProfessor,
                  arquivoBI: e.target.files[0],
                })
              }
            />
          </div>
          <button type="submit" className="btn-primary">
            Inscrever
          </button>
        </form>
      </section>

      <hr />

      <div className="lista-professores">
        <h3>
          <FaChalkboardTeacher /> Professores
        </h3>
        {listaProfessores.map((prof) => (
          <div key={prof.id} className="professor-item">
            <span>
              {prof.nome} - {prof.especialidade}
            </span>
            <button
              onClick={() => handleDeletarProfessor(prof.id)}
              className="btn-delete"
            >
              <FaTrashAlt />
            </button>
          </div>
        ))}
      </div>

      <hr />
      <GradeHorarios turmas={turmas} professores={listaProfessores} />

      <section className="secao-dashboard">
        <h2>
          <FaBullhorn /> Gerenciar Mural de Avisos
        </h2>

        <form onSubmit={handlePostarAviso} className="form-aviso">
          <input
            type="text"
            placeholder="Título do Aviso"
            value={novoAviso.titulo}
            onChange={(e) =>
              setNovoAviso({ ...novoAviso, titulo: e.target.value })
            }
            required
          />
          <textarea
            placeholder="Conteúdo da mensagem..."
            value={novoAviso.conteudo}
            onChange={(e) =>
              setNovoAviso({ ...novoAviso, conteudo: e.target.value })
            }
            required
          />
          <div className="form-inline">
            <select
              onChange={(e) =>
                setNovoAviso({ ...novoAviso, prioridade: e.target.value })
              }
            >
              <option value="normal">Prioridade: Normal</option>
              <option value="urgente">Prioridade: Urgente 🔥</option>
            </select>
            <button type="submit" className="btn-primary">
              Postar no Mural
            </button>
          </div>
        </form>

        <div className="lista-avisos-admin">
          {avisos.map((aviso) => (
            <div
              key={aviso.id}
              className={`aviso-item-admin ${aviso.prioridade}`}
            >
              <div>
                <strong>{aviso.titulo}</strong>
                <p>{aviso.conteudo.substring(0, 50)}...</p>
              </div>
              <button
                onClick={() => handleRemoverAviso(aviso.id)}
                className="btn-delete"
              >
                <FaTimes />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default DiretorDashboard;
