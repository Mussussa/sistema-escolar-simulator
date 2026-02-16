import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaLock, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import api from "../api/api";
import "../styler/login.css"; // Reutiliza o estilo do login

const RedefinirSenha = () => {
  const { token } = useParams(); // Captura o token do link: /redefinir-senha/TOKEN_AQUI
  const navigate = useNavigate();
  
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [status, setStatus] = useState({ tipo: "", msg: "" });
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    
    if (novaSenha !== confirmar) {
      return setStatus({ tipo: "erro", msg: "As senhas não coincidem." });
    }

    if (novaSenha.length < 6) {
      return setStatus({ tipo: "erro", msg: "A senha deve ter pelo menos 6 caracteres." });
    }

    setLoading(true);
    setStatus({ tipo: "", msg: "" });

    try {
      // Envia o token e a nova senha para a rota que criamos no Back-end
      const response = await api.post("/auth/redefinir-senha", { token, novaSenha });
      
      setStatus({ tipo: "sucesso", msg: response.data.mensagem });
      
      // Espera 3 segundos e manda para o login
      setTimeout(() => {
        navigate("/login");
      }, 3000);

    } catch (err) {
      setStatus({ 
        tipo: "erro", 
        msg: err.response?.data?.erro || "Link inválido ou expirado." 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Nova Senha</h2>
        <p className="login-subtitle">Escolha uma senha segura para a sua conta escolar</p>

        {status.msg && (
          <div className={status.tipo === "erro" ? "login-error" : "login-success"} 
               style={{ color: status.tipo === 'erro' ? '#ff4d4d' : '#2ecc71', marginBottom: '15px' }}>
            {status.tipo === "erro" ? <FaExclamationTriangle /> : <FaCheckCircle />} {status.msg}
          </div>
        )}

        <form onSubmit={handleReset} className="login-form">
          <div className="input-group">
            <label><FaLock /> Nova Senha</label>
            <input
              type="password"
              placeholder="Digite a nova senha"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              required
              disabled={loading || status.tipo === "sucesso"}
            />
          </div>

          <div className="input-group">
            <label><FaLock /> Confirmar Senha</label>
            <input
              type="password"
              placeholder="Confirme a nova senha"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              required
              disabled={loading || status.tipo === "sucesso"}
            />
          </div>

          <button type="submit" className="login-button" disabled={loading || status.tipo === "sucesso"}>
            {loading ? "A atualizar..." : "Gravar Nova Senha"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RedefinirSenha;