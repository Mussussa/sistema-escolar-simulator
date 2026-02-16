import { useState } from "react";
import { FaEnvelope, FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import "../styler/login.css"; // Reutiliza seu estilo de login

const EsqueciSenha = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({ tipo: "", msg: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ tipo: "", msg: "" });

    try {
      await api.post("/auth/esqueceu-senha", { email });
      setStatus({ 
        tipo: "sucesso", 
        msg: "Verifique seu e-mail! Enviamos o link de recuperação." 
      });
    } catch (err) {
      setStatus({ 
        tipo: "erro", 
        msg: err.response?.data?.erro || "Erro ao processar pedido." 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Recuperar Senha</h2>
        <p className="login-subtitle">Enviaremos um link para o seu e-mail</p>

        {status.msg && (
          <div className={status.tipo === "erro" ? "login-error" : "login-success"} 
               style={{ color: status.tipo === 'erro' ? 'red' : 'green', marginBottom: '10px' }}>
            {status.msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label><FaEnvelope /> Seu E-mail</label>
            <input
              type="email"
              placeholder="exemplo@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Enviando..." : "Enviar Link de Recuperação"}
          </button>
        </form>

        <button 
          onClick={() => navigate("/login")} 
          className="back-button"
          style={{ background: 'none', border: 'none', marginTop: '15px', cursor: 'pointer', color: '#666' }}
        >
          <FaArrowLeft /> Voltar para o Login
        </button>
      </div>
    </div>
  );
};

export default EsqueciSenha;