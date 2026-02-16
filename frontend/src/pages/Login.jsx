import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { FaUser, FaLock, FaSignInAlt, FaShieldAlt } from "react-icons/fa";
import api from "../api/api";
import "../styler/login.css";

const Login = () => {
  const [username, setUsername] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErro("");

    try {
      const response = await api.post("/auth/login", { username, senha });

      const { token, usuario } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("usuario", JSON.stringify(usuario));

      if (usuario.role === "configuracoes") {
        navigate("/configuracoes");
      } else if (usuario.role === "admin") {
        navigate("/diretor");
      } else if (usuario.role === "pendente") {
        navigate("/status-matricula");
      } else if (usuario.role === "matricula") {
        navigate("/diretor/matriculas");
      } else if (usuario.role === "aluno") {
        navigate("/dashboard-aluno");
      } else if (usuario.role === "propina") {
        navigate("/propinas");
      } else {
        navigate("/professor");
      }

      window.location.reload();
    } catch (err) {
      setErro(
        err.response?.data?.erro ||
          "Falha na autenticação. Verifique os dados.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-icon">
          <FaShieldAlt />
        </div>
        <h2 className="login-title">Sistema Escolar</h2>
        <p className="login-subtitle">Entre com suas credenciais</p>

        {erro && <div className="login-error">{erro}</div>}

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label>
              <FaUser /> Usuário
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Digite seu username"
              disabled={loading}
              autoComplete="off"
            />
          </div>

          <div className="input-group">
            <label>
              <FaLock /> Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              placeholder="********"
              disabled={loading}
              autoComplete="off"
            />
          </div>

          <button type="submit" disabled={loading} className="login-button">
            {loading ? (
              <>
                <span className="spinner"></span>
                Verificando...
              </>
            ) : (
              <>
                <FaSignInAlt />
                Entrar no Sistema
              </>
            )}
          </button>
          <div
            className="login-footer"
            style={{ marginTop: "15px", textAlign: "center" }}
          >
            <Link
              to="/esqueceu-senha"
              style={{
                color: "#4400ff",
                textDecoration: "none",
                fontSize: "14px",
              }}
            >
              Esqueceu sua senha?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
