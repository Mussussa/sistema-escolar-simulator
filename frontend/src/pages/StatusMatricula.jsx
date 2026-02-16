import React, { useEffect, useState } from "react";
import {
  FaUserGraduate,
  FaUser,
  FaHeartbeat,
  FaPhone,
  FaCalendarAlt,
  FaSchool,
  FaHistory,
  FaAllergies,
  FaUserFriends,
  FaClock,
  FaCheckCircle,
  FaHourglassHalf,
  FaMoneyBillWave,
  FaChartLine,
} from "react-icons/fa";
import api from "../api/api";
import "../styler/status.css";

const StatusMatricula = ({ usuarioId }) => {
  const [aluno, setAluno] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const buscarDadosMatricula = async () => {
      try {
        const response = await api.get(`/matricula/meu-status/${usuarioId}`);
        setAluno(response.data);
      } catch (error) {
        console.error("Erro ao buscar dados do aluno:", error);
      } finally {
        setLoading(false);
      }
    };

    if (usuarioId) buscarDadosMatricula();
  }, [usuarioId]);

  if (loading)
    return (
      <div className="loader-container">
        <div className="loader-spinner"></div>
        <p>Carregando dados da matrícula...</p>
      </div>
    );

  if (!aluno)
    return (
      <div className="erro-container">
        <div className="erro-icon">⚠️</div>
        <h3>Dados de matrícula não encontrados</h3>
      </div>
    );

  // CONFIGURAÇÃO DE STATUS ATUALIZADA PARA O SEU BACKEND
  const statusConfig = {
    doc_aprovado: {
      texto: "Matrícula Concluída",
      detalhe: "Você já possui acesso total ao sistema.",
      icone: <FaCheckCircle />,
      cor: "success",
    },
    pendente: {
      texto: "Aguardando Aprovação",
      detalhe: "Documento em análise pela secretaria",
      icone: <FaHourglassHalf />,
      cor: "warning",
    },
  };

  const status = statusConfig[aluno.status] || {
    texto: aluno.status,
    detalhe: aluno.motivo_rejeicao,
    icone: <FaHourglassHalf />,
    cor: "warning",
  };

  return (
    <div className="status-container">
      <div className="status-header">
        <div className="header-icon">
          <FaUserGraduate />
        </div>
        <h1>Ficha do Aluno</h1>
        <h2>
          Para ajuda ligue para:
          <a href="tel:+258866523158"> Registro Académico: 866523158</a>
        </h2>
        <p className="aluno-nome">{aluno.nome}</p>
      </div>

      {/* Banner de Status Principal */}
      <div className={`status-banner ${status.cor}`}>
        <div className="status-icon">{status.icone}</div>
        <div className="status-content">
          <h3 >Situação: {status.texto}</h3>
          <p style={{ color: "red" }}>{status.detalhe}</p>
        </div>
      </div>

      <div className="cards-grid">
        {/* Progresso da Matrícula */}
        <div className="info-card highlight">
          <div className="card-header">
            <div className="card-icon">
              <FaChartLine />
            </div>
            <h3>Progresso Geral</h3>
          </div>
          <div className="card-body">
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{ width: `${aluno.progresso}%` }}
              ></div>
            </div>
            <p className="progress-text">{aluno.progresso}% concluído</p>
          </div>
        </div>

        {/* Financeiro */}
        <div className="info-card">
          <div className="card-header">
            <div className="card-icon contact">
              <FaMoneyBillWave />
            </div>
            <h3>Financeiro</h3>
          </div>
          <div className="card-body">
            <div className="info-item">
              <div className="info-label">Status do Pagamento</div>
              <div
                className={`info-value badge ${aluno.pago ? "success" : "danger"}`}
              >
                {aluno.pago ? "PAGO" : "PENDENTE"}
              </div>
            </div>
          </div>
        </div>

        {/* Acadêmico */}
        <div className="info-card">
          <div className="card-header">
            <div className="card-icon academic">
              <FaSchool />
            </div>
            <h3>Acadêmico</h3>
          </div>
          <div className="card-body">
            <div className="info-item">
              <div className="info-label">
                <FaHistory /> Última Classe
              </div>
              <div className="info-value">{aluno.ultima_classe}</div>
            </div>
            <div className="info-item">
              <div className="info-label">
                <FaSchool /> Escola Anterior
              </div>
              <div className="info-value">
                {aluno.escola_anterior || "Não informada"}
              </div>
            </div>
          </div>
        </div>

        {/* Saúde */}
        <div className="info-card">
          <div className="card-header">
            <div className="card-icon health">
              <FaHeartbeat />
            </div>
            <h3>Saúde</h3>
          </div>
          <div className="card-body">
            <div className="info-item">
              <div className="info-label">Tipo Sanguíneo</div>
              <div className="info-value">{aluno.tipo_sanguineo}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Alergias</div>
              <div className="info-value">
                {aluno.alergias || "Nenhuma registrada"}
              </div>
            </div>
          </div>
        </div>

        {/* Emergência */}
        <div className="info-card">
          <div className="card-header">
            <div className="card-icon contact">
              <FaUserFriends />
            </div>
            <h3>Emergência</h3>
          </div>
          <div className="card-body">
            <div className="info-item">
              <div className="info-label">
                <FaUser /> Responsável
              </div>
              <div className="info-value">{aluno.contato_nome}</div>
            </div>
            <div className="info-item">
              <div className="info-label">
                <FaPhone /> Telefone
              </div>
              <div className="info-value">{aluno.telefone_emergencia}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusMatricula;
