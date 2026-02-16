import React, { useState, useEffect } from "react";
import {
  FaSearch,
  FaFilter,
  FaCalendarAlt,
  FaUsers,
  FaCheckCircle,
  FaExclamationTriangle,
  FaChartLine,
  FaMoneyCheckAlt,
  FaCheck,
  FaPlusCircle,
  FaFileInvoiceDollar,
  FaUserGraduate,
  FaBuilding,
} from "react-icons/fa";
import api from "../api/api";
import "../styler/Propinas.css";
import * as XLSX from "xlsx"; // Importa a biblioteca XLSX

const PainelPropinas = () => {
  const [estatisticas, setEstatisticas] = useState({
    totalMatriculados: 0,
    pagaram: 0,
    emAtraso: 0,
    pendentes: 0,
    taxaPagamento: 0,
  });
  const [turmas, setTurmas] = useState([]); // Lista de turmas para o select
  const [turmaFiltro, setTurmaFiltro] = useState("");
  const [listaMural, setListaMural] = useState([]);
  const [loading, setLoading] = useState(true);

  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [mesFiltro, setMesFiltro] = useState("");

  const [aviso, setAviso] = useState({ exibir: false, texto: "", tipo: "" });

  // Novos estados para a validação manual
  const [editandoId, setEditandoId] = useState(null);
  const [celulas, setCelulas] = useState(Array(18).fill(""));
  const inputsRef = React.useRef([]); // Para controlar o foco automático

  const handleCellChange = (e, index) => {
    const val = e.target.value.toUpperCase();
    const novasCelulas = [...celulas];

    if (val === "") {
      novasCelulas[index] = "";
      setCelulas(novasCelulas);
      return;
    }

    const caractere = val.slice(-1);
    novasCelulas[index] = caractere;
    setCelulas(novasCelulas);

    // Pula para o próximo input
    if (index < 17 && caractere !== "") {
      inputsRef.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !celulas[index] && index > 0) {
      inputsRef.current[index - 1].focus();
    }
  };

  // Nova versão do handleAprovar que envia a referência
  const confirmarComReferencia = async (id) => {
    const p1 = celulas.slice(0, 8).join("");
    const p2 = celulas.slice(8, 12).join("");
    const p3 = celulas.slice(12, 18).join("");
    const referenciaManual = `${p1}.${p2}.${p3}`;

    if (referenciaManual.length < 18) {
      return mostrarMensagem(
        "Preencha a referência completa (18 caracteres).",
        "erro",
      );
    }

    try {
      const res = await api.patch(`/diretor/propinas/aprovar/${id}`, {
        referenciaManual,
      });
      mostrarMensagem(res.data.mensagem, "sucesso");
      setEditandoId(null);
      setCelulas(Array(18).fill(""));
      carregarDados();
    } catch (err) {
      mostrarMensagem(err.response?.data?.erro || "Erro ao aprovar", "erro");
    }
  };

  const mostrarMensagem = (texto, tipo = "sucesso") => {
    setAviso({ exibir: true, texto, tipo });
    setTimeout(() => {
      setAviso({ exibir: false, texto: "", tipo: "" });
    }, 4000);
  };

  // Importa a biblioteca no topo

  // ... dentro do componente PainelPropinas ...

  const exportarExcel = () => {
    // 1. Preparar os dados (formatar para que o Excel fique bonito)
    const dadosFormatados = listaMural.map((item) => ({
      Aluno: item.nome,
      Curso: item.curso || "N/A",
      Mês: item.pagamento ? item.pagamento.mes : item.mesReferencia,
      Ano: item.pagamento ? item.pagamento.ano : new Date().getFullYear(),
      Valor: item.pagamento ? `${item.pagamento.valor_atual} MT` : "---",
      Situação: item.pagamento
        ? item.pagamento.status.toUpperCase()
        : "SEM FATURA",
    }));

    // 2. Criar a folha de trabalho (Worksheet)
    const ws = XLSX.utils.json_to_sheet(dadosFormatados);

    // 3. Criar o livro (Workbook)
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Propinas");

    // 4. Gerar o ficheiro e fazer o download
    XLSX.writeFile(wb, `Relatorio_Propinas_${mesFiltro || "Geral"}.xlsx`);
  };

  const carregarDados = async () => {
    try {
      const params = new URLSearchParams();
      if (busca) params.append("busca", busca);
      if (statusFiltro) params.append("status", statusFiltro);
      if (mesFiltro) params.append("mes", mesFiltro);
      if (turmaFiltro) params.append("turmaId", turmaFiltro);

      const [resEst, resLista, resTurmas] = await Promise.all([
        // Adicionado params aqui para os cards seguirem os filtros
        api.get(`/diretor/propinas/estatisticas?${params.toString()}`),
        api.get(`/diretor/propinas/lista?${params.toString()}`),
        api.get("/diretor/turmas"),
      ]);

      setEstatisticas(resEst.data);
      setListaMural(resLista.data);
      setTurmas(resTurmas.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      carregarDados();
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [busca, statusFiltro, mesFiltro, turmaFiltro]);

  const handleAprovar = async (id) => {
    if (!window.confirm("Confirmar recebimento deste valor?")) return;
    try {
      const res = await api.patch(`/diretor/propinas/aprovar/${id}`);
      mostrarMensagem(res.data.mensagem, "sucesso");
      carregarDados();
    } catch (err) {
      const msgErro =
        err.response?.data?.mensagem ||
        err.response?.data?.erro ||
        "Erro ao aprovar";
      mostrarMensagem(msgErro, "erro");
    }
  };

  const handleGerarFatura = async (alunoId) => {
    try {
      const res = await api.post("/diretor/propinas/gerar-fatura", { alunoId });
      mostrarMensagem(res.data.mensagem, "sucesso");
      carregarDados();
    } catch (err) {
      const msgErro =
        err.response?.data?.mensagem ||
        err.response?.data?.erro ||
        "Erro ao gerar";
      mostrarMensagem(msgErro, "erro");
    }
  };

  if (loading)
    return (
      <div className="loader-container">
        <div className="loader-spinner"></div>
        <p>Carregando painel financeiro...</p>
      </div>
    );

  return (
    <div className="painel-propinas">
      {/* Notificação Toast */}
      {aviso.exibir && (
        <div className={`toast-alerta ${aviso.tipo}`}>
          <div className="toast-icon">
            {aviso.tipo === "sucesso" ? (
              <FaCheckCircle />
            ) : (
              <FaExclamationTriangle />
            )}
          </div>
          <span className="toast-text">{aviso.texto}</span>
          <div className="barra-progresso"></div>
        </div>
      )}

      {/* Cabeçalho */}
      <header className="propinas-header">
        <div className="header-title">
          <FaMoneyCheckAlt className="header-icon" />
          <h1>Gestão de Propinas</h1>
        </div>

        <div className="filtros-container">
          <div className="filtro-group">
            <div className="filtro-input">
              <FaSearch className="filtro-icon" />
              <input
                type="text"
                placeholder="Nome do aluno..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </div>

          <div className="filtro-group">
            <div className="filtro-select">
              <FaFilter className="filtro-icon" />
              {/* MODO CORRETO (Sem ícones dentro do option) */}
              <select
                value={statusFiltro}
                onChange={(e) => setStatusFiltro(e.target.value)}
              >
                <option value="">Todos os Status</option>
                <option value="pago">Pago</option>
                <option value="pendente">Pendente</option>
                <option value="atrasado">Em Atraso</option>
                <option value="sem_registro">Sem Fatura</option>
              </select>
            </div>
          </div>

          <div className="filtro-group">
            <div className="filtro-select">
              <FaCalendarAlt className="filtro-icon" />
              <select
                value={mesFiltro}
                onChange={(e) => setMesFiltro(e.target.value)}
              >
                <option value="">Todos os Meses</option>
                {[
                  "Janeiro",
                  "Fevereiro",
                  "Março",
                  "Abril",
                  "Maio",
                  "Junho",
                  "Julho",
                  "Agosto",
                  "Setembro",
                  "Outubro",
                  "Novembro",
                  "Dezembro",
                ].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="filtro-group">
            <div className="filtro-select">
              <FaUsers className="filtro-icon" />
              <select
                value={turmaFiltro}
                onChange={(e) => setTurmaFiltro(e.target.value)}
              >
                <option value="">Todas as Turmas</option>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome} - {t.turno}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Cards Estatísticos */}
      <div className="propinas-grid">
        <div className="card-financeiro card-matriculados">
          <div className="card-icon">
            <FaUserGraduate />
          </div>
          <div className="card-content">
            <span className="card-label">Matriculados</span>
            <h3 className="card-value">{estatisticas.totalMatriculados}</h3>
          </div>
        </div>

        <div className="card-financeiro card-pagos">
          <div className="card-icon">
            <FaCheckCircle />
          </div>
          <div className="card-content">
            <span className="card-label">Pagos</span>
            <h3 className="card-value">{estatisticas.pagaram}</h3>
          </div>
        </div>

        <div className="card-financeiro card-atrasos">
          <div className="card-icon">
            <FaExclamationTriangle />
          </div>
          <div className="card-content">
            <span className="card-label">Atrasos</span>
            <h3 className="card-value">{estatisticas.emAtraso}</h3>
          </div>
        </div>

        <div className="card-financeiro card-taxa">
          <div className="card-icon">
            <FaChartLine />
          </div>
          <div className="card-content">
            <span className="card-label">Taxa de Cobrança</span>
            <h3 className="card-value">{estatisticas.taxaPagamento}%</h3>
          </div>
        </div>
      </div>

      {/* Tabela de Dados */}
      <div className="tabela-container">
        {/* Botão de Impressão - Visível apenas na tela */}
        <div className="acoes-impressao no-print">
          <button className="btn-imprimir" onClick={() => window.print()}>
            🖨️ Gerar PDF / Imprimir Lista
          </button>
          <button
            className="btn-excel"
            onClick={exportarExcel}
            style={{ backgroundColor: "#27ae60", color: "white" }}
          >
            📊 Exportar Excel
          </button>
        </div>

        {/* Cabeçalho de Documento - Visível apenas no PDF/Impressão */}
        <div className="cabecalho-oficial no-screen">
          <h2>
            {" "}
            Instituto Politécnico de Emprego e Gestão de Negócios - Hinstec
          </h2>
          <h3>Relatório Financeiro de Propinas</h3>
          <h5>UBUNTO - SISTEMA DE GESTÃO ESCOLAR</h5>
          <p>Data de Emissão: {new Date().toLocaleDateString()}</p>
          <hr />
        </div>
        <table className="tabela-propinas">
          <thead>
            <tr>
              <th>
                <FaUserGraduate /> Aluno / Curso
              </th>
              <th>
                <FaCalendarAlt /> Referência
              </th>
              <th>
                <FaMoneyCheckAlt /> Valor
              </th>
              <th>
                <FaFilter /> Situação
              </th>
              <th>
                <FaBuilding /> Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {listaMural.length > 0 ? (
              listaMural.map((item) => (
                <tr
                  key={item.id_aluno}
                  className={
                    item.situacao === "sem_registro" ? "linha-sem-fatura" : ""
                  }
                >
                  <td>
                    <div className="aluno-info">
                      <strong className="aluno-nome">{item.nome}</strong>
                      <small className="aluno-curso">
                        {item.curso || "Sem curso"}
                      </small>
                    </div>
                  </td>

                  {item.pagamento ? (
                    <>
                      {/* COLUNA: REFERÊNCIA (Quando existe pagamento) */}
                      <td>
                        <div className="referencia-info">
                          <span className="referencia-mes">
                            {item.pagamento.mes}
                          </span>
                          <span className="referencia-ano">
                            /{item.pagamento.ano}
                          </span>
                        </div>
                      </td>

                      {/* COLUNA: VALOR */}
                      <td>
                        <div
                          className={`valor-info ${item.pagamento.nivel_multa > 0 ? "com-multa" : ""}`}
                        >
                          <span className="valor-numero">
                            {Number(
                              item.pagamento.valor_atual,
                            ).toLocaleString()}{" "}
                            MT
                          </span>
                          {item.pagamento.nivel_multa > 0 && (
                            <small className="valor-multa">+ multa</small>
                          )}
                        </div>
                      </td>

                      {/* COLUNA: SITUAÇÃO */}
                      <td>
                        <span
                          className={`badge-status ${item.pagamento.status}`}
                        >
                          {item.pagamento.status === "atrasado" ? (
                            <>
                              <FaExclamationTriangle /> ATRASADO
                            </>
                          ) : (
                            item.pagamento.status.toUpperCase()
                          )}
                        </span>
                      </td>

                      {/* COLUNA: AÇÕES */}
                      <td>
                        {item.pagamento ? (
                          /* SE EXISTE PAGAMENTO: Nunca mostramos o botão de "Gerar" */
                          item.pagamento.status !== "pago" ? (
                            editandoId === item.pagamento.id ? (
                              /* MODO EDIÇÃO: Inputs de quadradinhos */
                              <div className="validacao-manual-container">
                                <div className="grid-referencia-mini">
                                  {celulas.map((valor, i) => (
                                    <React.Fragment key={i}>
                                      <input
                                        ref={(el) =>
                                          (inputsRef.current[i] = el)
                                        }
                                        className="input-referencia-celula"
                                        value={valor}
                                        onChange={(e) => handleCellChange(e, i)}
                                        onKeyDown={(e) => handleKeyDown(e, i)}
                                        maxLength={1}
                                        type="text" // Remove as setas nativas automaticamente
                                        inputMode="numeric" // Abre o teclado numérico no Android/iPhone
                                        pattern="[0-9]*" // Ajuda na validação mobile
                                        autoComplete="off"
                                      />
                                      {(i === 7 || i === 11) && (
                                        <span className="separador">.</span>
                                      )}
                                    </React.Fragment>
                                  ))}
                                </div>
                                <div className="botoes-confirmacao-mini">
                                  <button
                                    className="btn-v-ok"
                                    onClick={() =>
                                      confirmarComReferencia(item.pagamento.id)
                                    }
                                  >
                                    <FaCheck />
                                  </button>
                                  <button
                                    className="btn-v-cancel"
                                    onClick={() => setEditandoId(null)}
                                  >
                                    <FaPlusCircle
                                      style={{ transform: "rotate(45deg)" }}
                                    />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* MODO NORMAL: Botão de Validar */
                              <button
                                onClick={() => setEditandoId(item.pagamento.id)}
                                className="btn-aprovar"
                              >
                                <FaCheck /> Validar Pagamento
                              </button>
                            )
                          ) : (
                            /* SE JÁ ESTÁ PAGO */
                            <span className="texto-pago">
                              <FaCheckCircle /> Confirmado
                            </span>
                          )
                        ) : (
                          /* SE NÃO EXISTE PAGAMENTO: Só aqui o botão de gerar aparece */
                          <button
                            onClick={() => handleGerarFatura(item.id_aluno)}
                            className="btn-gerar"
                          >
                            <FaPlusCircle /> Gerar Fatura
                          </button>
                        )}
                      </td>
                    </>
                  ) : (
                    <>
                      {/* COLUNA: REFERÊNCIA (Baseada no mês que o backend sugeriu) */}
                      <td>
                        <div className="referencia-info pendente">
                          <span className="referencia-mes">
                            {item.mesReferencia}
                          </span>
                          <span className="referencia-ano">
                            /{new Date().getFullYear()}
                          </span>
                        </div>
                      </td>

                      {/* COLUNA: VALOR (Aviso que não foi gerado) */}
                      <td>
                        <div className="valor-info vazio">
                          <span className="valor-numero">---</span>
                          <small className="aviso-gerar">
                            Fatura não gerada
                          </small>
                        </div>
                      </td>

                      {/* COLUNA: SITUAÇÃO */}
                      <td>
                        <span className="badge-status sem-registro">
                          <FaFileInvoiceDollar /> SEM FATURA
                        </span>
                      </td>

                      {/* COLUNA: AÇÕES */}
                      <td>
                        <button
                          onClick={() => handleGerarFatura(item.id_aluno)}
                          className="btn-gerar"
                        >
                          <FaPlusCircle /> Gerar Fatura
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="sem-dados">
                  <div className="sem-dados-content">
                    <FaSearch className="sem-dados-icon" />
                    <p>Nenhum aluno encontrado com os filtros atuais.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PainelPropinas;
