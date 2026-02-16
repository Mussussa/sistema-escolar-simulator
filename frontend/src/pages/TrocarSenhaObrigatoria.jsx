import { useState } from "react";
import api from "../api/api";
import "../styler/senha.css";

const TrocarSenhaObrigatoria = ({ onSucesso, modoVoluntario = false }) => {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const validarSenhaForte = (senha) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(senha);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    if (novaSenha !== confirmar) {
      setCarregando(false);
      return setErro("As senhas não coincidem.");
    }

    if (!validarSenhaForte(novaSenha)) {
      setCarregando(false);
      return setErro(
        "A senha deve ter pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas, números e um símbolo."
      );
    }

    try {
      await api.post("/auth/alterar-senha-obrigatoria", { 
        senhaAtual, 
        novaSenha 
      });

      // Atualiza o localStorage apenas se existir um usuário salvo
      const userStr = localStorage.getItem("usuario");
      if (userStr) {
        const user = JSON.parse(userStr);
        user.deve_alterar_senha = false;
        localStorage.setItem("usuario", JSON.stringify(user));
      }

      alert("Senha alterada com sucesso!");

      // PROTEÇÃO CONTRA O ERRO "TypeError: e is not a function"
      if (onSucesso && typeof onSucesso === "function") {
        onSucesso();
      } else if (!modoVoluntario) {
        // Se for obrigatório e não passarem função, recarrega para limpar o bloqueio
        window.location.reload();
      }

      // Limpa os campos se for troca voluntária
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmar("");

    } catch (err) {
      console.error("Erro ao trocar senha:", err);
      setErro(err.response?.data?.erro || "Erro ao trocar senha.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className={modoVoluntario ? "senha-container-config" : "senha-overlay"}>
      <div className="senha-modal card-animado">
        <h3>{modoVoluntario ? "Alterar Senha" : "Primeiro Acesso: Troca de Senha"}</h3>
        <p>Use uma combinação segura para proteger sua conta.</p>

        <form onSubmit={handleSubmit}>
          <div className="input-box">
            <input
              type="password"
              placeholder="Senha Atual"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              required
            />
          </div>
          
          <div className="input-box">
            <input
              type="password"
              placeholder="Nova Senha"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              required
            />
          </div>

          <div className="input-box">
            <input
              type="password"
              placeholder="Confirmar Nova Senha"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              required
            />
          </div>

          {erro && <p className="error-text" style={{ color: '#ff4d4d', fontSize: '0.85rem', marginTop: '10px' }}>{erro}</p>}

          <button type="submit" className="btn-save-all" disabled={carregando}>
            {carregando ? "Processando..." : "Salvar Nova Senha"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TrocarSenhaObrigatoria;