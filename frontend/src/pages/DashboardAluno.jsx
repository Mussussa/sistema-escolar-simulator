import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api'; 
import '../styler/dashboard.css';

const DashboardAluno = () => {
  const navigate = useNavigate();
  const [dados, setDados] = useState({
    perfil: null,
    avisos: []
  });
  const [loading, setLoading] = useState(true);

  // Estados para controlar a exibição da grade
  const [diasVisiveis, setDiasVisiveis] = useState(['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']);
  const [ehSemiPresencial, setEhSemiPresencial] = useState(false);

  useEffect(() => {
    let montado = true;
    const carregarDados = async () => {
      try {
        setLoading(true);
        const [perfilRes, avisosRes] = await Promise.all([
          api.get('/aluno/dashboard'),
          api.get('/aluno/avisos')
        ]);

        if (montado) {
          const perfil = perfilRes.data;
          setDados({
            perfil: perfil,
            avisos: avisosRes.data
          });

          // --- LÓGICA DE DETEÇÃO DE REGIME ---
          const regime = perfil?.turma?.curso?.regime?.toLowerCase() || "";
          const horarios = perfil?.turma?.horarios || [];
          
          // Verifica se é semi pelo nome do curso ou se tem aula ao sábado
          const temAulaSabado = horarios.some(h => h.dia_semana === "Sábado" || h.dia_semana === "Domingo");
          
          if (regime.includes("semi") || temAulaSabado) {
            setEhSemiPresencial(true);
            setDiasVisiveis(['Sábado', 'Domingo']);
          } else {
            setEhSemiPresencial(false);
            setDiasVisiveis(['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira']);
          }
        }
      } catch (error) {
        console.error("Erro ao sincronizar dashboard:", error);
      } finally {
        if (montado) setLoading(false);
      }
    };
    carregarDados();
    return () => { montado = false; };
  }, []); 

  // Calcula quantos tempos (linhas) a tabela deve ter
  const temposDinamicos = (() => {
    const horarios = dados.perfil?.turma?.horarios || [];
    if (horarios.length === 0) return [1, 2, 3, 4, 5];
    
    // Se for semi, geralmente são 4 blocos
    if (ehSemiPresencial) return [1, 2, 3, 4];

    const max = Math.max(...horarios.map(h => h.ordem_tempo), 5);
    return Array.from({ length: max }, (_, i) => i + 1);
  })();

  const obterAula = (dia, tempo) => {
    // Normaliza para comparar "Segunda" com "Segunda-feira" se necessário
    return dados.perfil?.turma?.horarios?.find(
      h => h.dia_semana.includes(dia.split('-')[0]) && Number(h.ordem_tempo) === Number(tempo)
    );
  };

  // Função auxiliar para mostrar horário bonito no Semi-Presencial
  const getHorarioLabel = (tempo) => {
    if (ehSemiPresencial) {
      const h = ["08:00-10:00", "10:15-12:15", "13:00-15:00", "15:15-17:15"];
      return h[tempo - 1];
    }
    return null; 
  };

  if (loading) return <div className="loader">Carregando painel acadêmico...</div>;

  return (
    <div className="dashboard-container">
      <header className="dash-header">
        <div>
          <h1>Bem-vindo, {dados.perfil?.nome}</h1>
          <p className="sub-info">
            <strong>Curso:</strong> {dados.perfil?.turma?.curso?.nome} | 
            <strong> Turma:</strong> {dados.perfil?.turma?.nome} |
            <strong> Regime:</strong> {dados.perfil?.turma?.curso?.regime || "Laboral"}
          </p>
        </div>
        <button className="btn-historico" onClick={() => navigate('/status-matricula')}>
          <i className="fas fa-history"></i> Ver informações pessoal completa
        </button>
      </header>

      <div className="dash-grid">
        <section className="dash-card avisos" style={{ gridColumn: "1 / -1" }}>
          <h3><i className="fas fa-bell"></i> Mural de Avisos</h3>
          <div className="avisos-lista">
            {dados.avisos.length > 0 ? (
              dados.avisos.map(aviso => (
                <div key={aviso.id} className={`aviso-card ${aviso.tipo?.toLowerCase()}`}>
                  <h4>{aviso.titulo}</h4>
                  <p>{aviso.conteudo}</p>
                </div>
              ))
            ) : (
              <p className="vazio">Nenhum aviso no momento.</p>
            )}
          </div>
        </section>
      </div>

      <section className="dash-card horario-semanal">
        <h3><i className="fas fa-calendar-alt"></i> Grade de Horários</h3>
        <div className="table-responsive">
          <table className="horario-table">
            <thead>
              <tr>
                <th style={{width: '100px'}}>Tempo</th>
                {diasVisiveis.map(dia => <th key={dia}>{dia.split('-')[0]}</th>)}
              </tr>
            </thead>
            <tbody>
              {temposDinamicos.map(tempo => (
                <tr key={`tempo-${tempo}`}>
                  <td className="tempo-num">
                    {tempo}º
                    {ehSemiPresencial && (
                      <div style={{fontSize: '0.7em', fontWeight: 'normal', color: '#666', marginTop:'2px'}}>
                        {getHorarioLabel(tempo)}
                      </div>
                    )}
                  </td>
                  {diasVisiveis.map(dia => {
                    const aula = obterAula(dia, tempo);
                    return (
                      <td key={`${dia}-${tempo}`} className={aula ? 'tem-aula' : 'vazio'}>
                        {aula ? (
                          <div className="info-aula">
                            <span className="materia">{aula.disciplina?.nome}</span>
                            <span className="horario">{aula.hora_inicio?.slice(0, 5)}</span>
                          </div>
                        ) : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default DashboardAluno;