import React, { useState, useEffect } from "react"; // IMPORTANTE: Adicionei useState e useEffect
import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
  Navigate,
} from "react-router-dom";

// Ícones
import {
  FaHome,
  FaUserPlus,
  FaLock,
  FaCogs,
  FaChartBar,
  FaBell,
  FaClipboardList,
  FaChalkboardTeacher,
  FaMoneyBillWave,
  FaUserGraduate,
  FaSignOutAlt,
  FaHistory,
  FaFileInvoiceDollar,
  FaWifi,
  FaExclamationTriangle, // Novos ícones para o aviso
} from "react-icons/fa";

// Páginas
import Login from "./pages/Login";
import Configuracoes from "./pages/Configuracoes";
import DiretorDashboard from "./pages/DiretorDashboard";
import PainelProfessor from "./pages/PainelProfessor";
import Home from "./pages/Home";
import StatusMatricula from "./pages/StatusMatricula";
import GestaoMatriculas from "./pages/GestaoMatriculas";
import ProtectedRoute from "./components/ProtectedRoute";
import Inscricao from "./pages/Inscricao";
import DashboardAluno from "./pages/DashboardAluno";
import PainelPropinas from "./pages/PainelPropinas";
import HistoricoAcademico from "./pages/HistoricoAcademico";
import MeusPagamentos from "./pages/MeusPagamentos";
import HistoricoAluno from "./pages/HistoricoAluno";
import AlterarSenha from "./pages/TrocarSenhaObrigatoria";
import EsqueciSenha from "./pages/EsqueciSenha";
import RedefinirSenha from "./pages/RedefinirSenha";
import api from "./api/api"; // <-- Importe o seu axios configurado

import "./App.css";

function App() {
  const userJson = localStorage.getItem("usuario");
  const user = userJson ? JSON.parse(userJson) : null;

  // --- ESTADOS DE CONEXÃO ---
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [reconnecting, setReconnecting] = useState(false);

  // --- LÓGICA DE MONITORAMENTO DE REDE ---
  useEffect(() => {
    // 1. Função que testa se o servidor responde (Ping)
    const checkServerConnection = async () => {
      try {
        // Ajuste a URL abaixo para o endereço do seu backend na Render/Local
        // Se estiveres local: http://localhost:5000/ping
        // Se estiveres na produção: https://teu-backend.onrender.com/ping
        const response = await fetch(
          "https://ubuntu-web-solution-hila.onrender.com/ping",
        );
        return response.ok;
      } catch (error) {
        return false;
      }
    };

    // 2. Listeners nativos do navegador
    const handleOnline = async () => {
      setReconnecting(true);
      const serverOk = await checkServerConnection();
      if (serverOk) {
        setIsOnline(true);
        setReconnecting(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 3. Heartbeat: Se estiver offline, tenta reconectar a cada 5 segundos
    let intervalId;
    if (!isOnline) {
      intervalId = setInterval(async () => {
        const serverOk = await checkServerConnection();
        if (serverOk) {
          setIsOnline(true);
          setReconnecting(false);
        }
      }, 5000);
    }

    // Limpeza (Cleanup) para não deixar lixo na memória
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOnline]); // Executa sempre que o status mudar

  // --- ESTILOS DO MENU ---
  const iconStyle = {
    marginRight: "8px",
    fontSize: "1.1em",
    verticalAlign: "middle",
  };

  return (
    <Router>
      {/* --- BARRA DE AVISO DE CONEXÃO --- */}
      {!isOnline && (
        <div
          style={{
            backgroundColor: "#e74c3c",
            color: "white",
            textAlign: "center",
            padding: "10px",
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            zIndex: 9999,
            fontWeight: "bold",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <FaExclamationTriangle />
          <span>
            Sem conexão com a internet. Verificando...{" "}
            {reconnecting && "(Tentando reconectar)"}
          </span>
        </div>
      )}

      {/* Adicionamos uma margem no topo se estiver offline para o menu não ficar escondido */}
      <div style={{ marginTop: !isOnline ? "40px" : "0", transition: "0.3s" }}>
        {/* Navbar Pública */}
        {!user && (
          <nav className="navbar-public no-print">
            <NavLink to="/" className="nav-link">
              <FaHome style={iconStyle} /> Início
            </NavLink>
            <NavLink to="/inscricao" className="nav-link">
              <FaUserPlus style={iconStyle} /> Inscrição
            </NavLink>
            <NavLink to="/login" className="nav-link">
              <FaLock style={iconStyle} /> Login
            </NavLink>
          </nav>
        )}

        {/* Menu Principal (Privado) */}
        {user && (
          <nav className="navbar no-print">
            {user.role === "configuracoes" && (
              <NavLink to="/configuracoes" className="nav-link">
                <FaCogs style={iconStyle} /> Estrutura
              </NavLink>
            )}

            {(user.role === "admin" || user.role === "diretor") && (
              <>
                <NavLink to="/diretor" className="nav-link">
                  <FaChartBar style={iconStyle} /> Painel Direção
                </NavLink>
              </>
            )}

            {user.role === "matricula" && (
              <>
                <NavLink to="/diretor/matriculas" className="nav-link">
                  <FaClipboardList style={iconStyle} /> Gestão de Matrículas
                </NavLink>
                <NavLink to="/diretor/historicoAluno" className="nav-link">
                  <FaHistory style={iconStyle} /> Histórico Acadêmico
                </NavLink>
              </>
            )}

            {user.role === "professor" && (
              <NavLink to="/professor" className="nav-link">
                <FaChalkboardTeacher style={iconStyle} /> Meu Diário
              </NavLink>
            )}

            {(user.role === "propina" || user.role === "admin") && (
              <NavLink to="/propinas" className="nav-link">
                <FaMoneyBillWave style={iconStyle} /> Gestão Financeira
              </NavLink>
            )}

            {user.role === "aluno" && (
              <>
                <NavLink to="/dashboard-aluno" className="nav-link">
                  <FaUserGraduate style={iconStyle} /> Painel Geral
                </NavLink>
                <NavLink to="/historico-academico" className="nav-link">
                  <FaHistory style={iconStyle} /> Notas e Faltas
                </NavLink>
                <NavLink to="/meus-pagamentos" className="nav-link">
                  <FaFileInvoiceDollar style={iconStyle} /> Minhas Propinas
                </NavLink>
              </>
            )}

            <NavLink to="/alterar-senha" className="nav-link">
              <FaLock style={iconStyle} /> Alterar Senha
            </NavLink>

            <button
              onClick={async () => {
                try {
                  // 1. Avisa o backend para destruir o cookie
                  await api.post("/auth/logout");
                } catch (error) {
                  console.error("Erro ao fazer logout", error);
                } finally {
                  // 2. Limpa o localStorage (dados do usuário) e redireciona
                  localStorage.clear();
                  window.location.href = "/login";
                }
              }}
              className="nav-link btn-sair"
            >
              <FaSignOutAlt /> Sair
            </button>
          </nav>
        )}

        <div className="content">
          <Routes>
            {/* Rotas Públicas */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/inscricao" element={<Inscricao />} />
            <Route path="/esqueceu-senha" element={<EsqueciSenha />} />
            <Route
              path="/redefinir-senha/:token"
              element={<RedefinirSenha />}
            />

            {/* Rotas Privadas */}
            <Route
              path="/alterar-senha"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "aluno",
                    "configuracoes",
                    "admin",
                    "matricula",
                    "propina",
                    "professor",
                    "diretor",
                    "pendente",
                  ]}
                >
                  <AlterarSenha usuarioId={user?.id} />
                </ProtectedRoute>
              }
            />

            <Route
              path="/status-matricula"
              element={
                <ProtectedRoute allowedRoles={["pendente", "aluno"]}>
                  <StatusMatricula usuarioId={user?.id} />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard-aluno"
              element={
                <ProtectedRoute allowedRoles={["aluno"]}>
                  <DashboardAluno />
                </ProtectedRoute>
              }
            />
            <Route
              path="/historico-academico"
              element={
                <ProtectedRoute allowedRoles={["aluno", "admin"]}>
                  <HistoricoAcademico />
                </ProtectedRoute>
              }
            />
            <Route
              path="/meus-pagamentos"
              element={
                <ProtectedRoute allowedRoles={["aluno"]}>
                  <MeusPagamentos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/propinas"
              element={
                <ProtectedRoute allowedRoles={["propina", "admin"]}>
                  <PainelPropinas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/diretor/matriculas"
              element={
                <ProtectedRoute
                  allowedRoles={["matricula", "admin", "diretor"]}
                >
                  <GestaoMatriculas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/diretor/historicoAluno"
              element={
                <ProtectedRoute
                  allowedRoles={["matricula", "admin", "diretor"]}
                >
                  <HistoricoAluno />
                </ProtectedRoute>
              }
            />
            <Route
              path="/diretor"
              element={
                <ProtectedRoute allowedRoles={["admin", "diretor"]}>
                  <DiretorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/professor"
              element={
                <ProtectedRoute allowedRoles={["professor"]}>
                  <PainelProfessor professorId={user?.contextoId} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/configuracoes"
              element={
                <ProtectedRoute allowedRoles={["configuracoes", "admin"]}>
                  <Configuracoes />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
