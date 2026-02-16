import React, { useState, useEffect } from "react";
import {
  FaUser,
  FaUserCircle,
  FaGraduationCap,
  FaLock,
  FaEnvelope,
  FaBook,
  FaPhone,
  FaUserFriends,
  FaTint,
  FaFilePdf,
  FaPaperPlane,
} from "react-icons/fa";
import api from "../api/api";
import "../styler/inscricao.css";

const Inscricao = () => {
  const [cursos, setCursos] = useState([]);
  const [formData, setFormData] = useState({
    nome: "",
    username: "",
    senha: "",
    email: "",
    cursoId: "",
    ultima_classe: "",
    telefone_emergencia: "",
    contato_nome: "",
    tipo_sanguineo: "",
    alergias: "",
    contacto: "",
  });

  const [arquivo, setArquivo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: "", texto: "" });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validarSenhaForte = (senha) => {
    const regexSenha = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    return regexSenha.test(senha);
  };

const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensagem({ tipo: "", texto: "" });

    // --- FUNÇÕES AUXILIARES ---
    const validarContactoMZ = (num) => {
      // Aceita: 82, 83, 84, 85, 86, 87 seguido de 7 digitos. Aceita prefixo +258 ou 258 opcional.
      const regexMZ = /^(\+258|258)?(8[2-7])\d{7}$/;
      return regexMZ.test(num.replace(/\s/g, ""));
    };

    // --- 1. VALIDAÇÃO DE CAMPOS DE TEXTO ---

    // Nome
    if (formData.nome.trim().split(" ").length < 2) {
      setLoading(false);
      return setMensagem({ tipo: "erro", texto: "Por favor, insira o seu nome completo." });
    }

    // Username
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(formData.username)) {
      setLoading(false);
      return setMensagem({ tipo: "erro", texto: "O usuário só pode conter letras, números e _." });
    }

    // Senha Forte
    if (!validarSenhaForte(formData.senha)) {
      setLoading(false);
      return setMensagem({ 
        tipo: "erro", 
        texto: "A senha deve ter 8+ caracteres, uma maiúscula e um número." 
      });
    }

    // Contactos (Moçambique)
    if (!validarContactoMZ(formData.contacto)) {
      setLoading(false);
      return setMensagem({ tipo: "erro", texto: "Contacto inválido! Use um número Vodacom, Movitel ou Tmcel." });
    }

    if (!validarContactoMZ(formData.telefone_emergencia)) {
      setLoading(false);
      return setMensagem({ tipo: "erro", texto: "O telefone de emergência deve ser um número válido de Moçambique." });
    }

    // --- 2. VALIDAÇÃO DE ARQUIVO (PDF) ---
    if (!arquivo) {
      setLoading(false);
      return setMensagem({ tipo: "erro", texto: "É obrigatório anexar o documento (PDF)." });
    }

    if (arquivo.type !== "application/pdf") {
      setLoading(false);
      return setMensagem({ tipo: "erro", texto: "Formato inválido! O arquivo deve ser PDF." });
    }

    const tamanhoMaximo = 5 * 1024 * 1024; // 5MB
    if (arquivo.size > tamanhoMaximo) {
      setLoading(false);
      return setMensagem({ tipo: "erro", texto: "Arquivo muito grande. Máximo 5MB." });
    }

    // --- 3. ENVIO DOS DADOS ---
    const data = new FormData();
    Object.keys(formData).forEach((key) => data.append(key, formData[key]));
    data.append("documento", arquivo);

    try {
      await api.post("/matricula/inscrever", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMensagem({
        tipo: "sucesso",
        texto: "Inscrição enviada com sucesso! Redirecionando...",
      });
      setTimeout(() => (window.location.href = "/login"), 3000);
    } catch (error) {
      let mensagemErro = "Erro ao enviar inscrição";
      
      if (error.response?.data?.erro) {
        const erroRaw = error.response.data.erro;
        // Mapeamento de erros do Backend
        if (erroRaw.includes("username")) mensagemErro = "Este nome de usuário já existe.";
        else if (erroRaw.includes("email")) mensagemErro = "Este email já está cadastrado.";
        else mensagemErro = erroRaw;
      }
      setMensagem({ tipo: "erro", texto: mensagemErro });
    } finally {
      setLoading(false);
    }
  };

  const buscarcursos = async () => {
    try {
      const resCursos = await api.get("/matricula/cursos");
      setCursos(resCursos.data || []);
    } catch (err) {
      console.error("Erro ao carregar dados", err);
    }
  };

  useEffect(() => {
    buscarcursos();
  }, []);

  // Dentro do seu componente MeusPagamentos

  // Este useEffect monitora quando uma mensagem é escrita
  useEffect(() => {
    if (mensagem.texto) {
      const timer = setTimeout(() => {
        setMensagem({ texto: "", tipo: "" }); // Limpa a mensagem após 5s
      }, 5000);

      return () => clearTimeout(timer); // Limpa o timer se o componente desmontar
    }
  }, [mensagem]);

  return (
    <div className="inscricao-container">
      <div className="inscricao-card">
        <div className="inscricao-header">
          <div className="inscricao-icon">
            <FaGraduationCap />
          </div>
          <h2 className="inscricao-title">Pré-Inscrição</h2>
          <p className="inscricao-subtitle">
            Preencha os dados abaixo e anexe seu documento para iniciar a
            matrícula.
          </p>
        </div>

        {mensagem.texto && (
          <div className={`alert alert-${mensagem.tipo}`}>
            <span>{mensagem.texto}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="inscricao-form">
          <div className="form-grid">
            {/* Nome Completo */}
            <div className="input-group">
              <label>
                <FaUser /> Nome Completo *
              </label>
              <input
                type="text"
                name="nome"
                required
                onChange={handleChange}
                placeholder="Digite seu nome completo"
              />
            </div>

            {/* Username */}
            <div className="input-group">
              <label>
                <FaUserCircle /> Nome de Usuário *
              </label>
              <input
                type="text"
                name="username"
                required
                onChange={handleChange}
                placeholder="Escolha um nome de usuário"
              />
            </div>
            <div className="input-group">
              <label>
                <FaUserCircle /> Contacto *
              </label>
              <input
                type="text"
                name="contacto"
                required
                onChange={handleChange}
                placeholder="Número de contacto"
              />
            </div>

            {/* Curso */}
            <div className="input-group">
              <label>
                <FaGraduationCap /> Curso Pretendido *
              </label>
              <select
                name="cursoId"
                required
                onChange={handleChange}
                value={formData.cursoId}
              >
                <option value="">Selecione um curso</option>
                {cursos.map((curso) => (
                  <option key={curso.id} value={curso.id}>
                    {curso.nome} ({curso.regime})
                  </option>
                ))}
              </select>
            </div>

            {/* Senha */}
            <div className="input-group">
              <label>
                <FaLock /> Senha *
              </label>
              <input
                type="password"
                name="senha"
                required
                onChange={handleChange}
                placeholder="Crie uma senha segura"
              />
            </div>

            {/* Email */}
            <div className="input-group">
              <label>
                <FaEnvelope /> Email *
              </label>
              <input
                type="email"
                name="email"
                required
                onChange={handleChange}
                placeholder="seu@email.com"
              />
            </div>

            {/* Última Classe */}
            <div className="input-group">
              <label>
                <FaBook /> Última Classe Concluída *
              </label>
              <select name="ultima_classe" onChange={handleChange} required>
                <option value="">Selecione</option>
                <option value="10º classe">10º classe</option>
                <option value="12º classe">12º classe</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            {/* Telefone Emergência */}
            <div className="input-group">
              <label>
                <FaPhone /> Telefone de Emergência *
              </label>
              <input
                type="tel"
                name="telefone_emergencia"
                required
                onChange={handleChange}
                placeholder="+258 8XX XXX XXX"
              />
            </div>

            {/* Contato Emergência */}
            <div className="input-group">
              <label>
                <FaUserFriends /> Nome do Contato *
              </label>
              <input
                type="text"
                name="contato_nome"
                required
                onChange={handleChange}
                placeholder="Nome do contato de emergência"
              />
            </div>

            {/* Tipo Sanguíneo */}
            <div className="input-group">
              <label>
                <FaTint /> Tipo Sanguíneo
              </label>
              <select name="tipo_sanguineo" onChange={handleChange}>
                <option value="">Selecione</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
          </div>

          {/* Nome Completo */}
          <div className="input-group">
            <label>
              <FaUser /> Descreva suas alergias ou doenças crônicas
            </label>
            <input
              type="text"
              name="alergias"
              onChange={handleChange}
              placeholder="Digite suas alergias ou doenças crônicas"
            />
          </div>

          {/* Documento */}
          <div className="input-group full-width">
            <label>
              <FaFilePdf /> Documento de Candidatura *
            </label>
            <div className="file-upload">
              <input
                type="file"
                name="documento"
                accept="application/pdf, .pdf"
                onChange={(e) => setArquivo(e.target.files[0])}
                id="documento"
              />
              <label htmlFor="documento" className="file-label">
                <FaFilePdf />{" "}
                {arquivo ? arquivo.name : "Escolher arquivo (PDF)"}
              </label>
            </div>
          </div>

          {/* Botão de Envio */}
          <button type="submit" disabled={loading} className="btn-enviar">
            {loading ? (
              <>
                <span className="spinner"></span>
                Processando...
              </>
            ) : (
              <>
                <FaPaperPlane />
                Enviar Inscrição
              </>
            )}
          </button>

          <div className="legal-info">
            <p>
              <small>* Campos obrigatórios</small>
            </p>
            <p>
              <small>
                Ao enviar este formulário, você concorda com nossos termos e
                condições.
              </small>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Inscricao;
