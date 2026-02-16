import React, { useState, useEffect } from "react";
import api from "../api/api";
import { calcularStatusAluno } from "../utils/avaliador";
import * as XLSX from "xlsx"; // No topo do arquivo

const PainelNotas = ({ turmaId, disciplinaId }) => {
  const [configuracoes, setConfiguracoes] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [editandoPesos, setEditandoPesos] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const [tempConfig, setTempConfig] = useState([
    { nome: "Teste 1", peso: 50 },
    { nome: "Teste 2", peso: 50 },
  ]);

  // ... dentro do componente PainelNotas ...

  const exportarExcel = () => {
    if (alunos.length === 0) return alert("Não há dados para exportar.");

    // 1. Preparar os dados
    const dadosParaExportar = alunos.map((aluno) => {
      // Objeto base com informações fixas
      const linha = {
        "Nome do Estudante": aluno.nome,
        "Frequência (%)": `${aluno.percPresenca}%`,
      };

      // Adicionar colunas dinâmicas para cada teste configurado
      configuracoes.forEach((conf) => {
        const notaEncontrada = aluno.notas?.find(
          (n) => n.configuracaoId === conf.id,
        );
        linha[`${conf.nome} (${conf.peso}%)`] = notaEncontrada
          ? `${notaEncontrada.valor}%`
          : "---";
      });

      // Adicionar totais e status
      linha["Média Final"] = `${aluno.mf}%`;
      linha["Resultado"] = aluno.statusFinal;

      return linha;
    });

    // 2. Processo de criação do arquivo
    const ws = XLSX.utils.json_to_sheet(dadosParaExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pauta de Notas");

    // 3. Download
    XLSX.writeFile(wb, `Pauta_${turmaId}_Disciplina_${disciplinaId}.xlsx`);
  };

  useEffect(() => {
    if (turmaId && disciplinaId) {
      carregarDados();
    }
  }, [disciplinaId, turmaId]);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const [resConf, resPauta] = await Promise.all([
        api.get(`/professor/configuracao-notas/${disciplinaId}`),
        api.get(`/professor/pauta/${turmaId}/${disciplinaId}`),
      ]);

      const dadosConfig = Array.isArray(resConf.data) ? resConf.data : [];
      const dadosAlunosRaw = Array.isArray(resPauta.data) ? resPauta.data : [];

      // IMPORTANTE: Calcular status inicial de todos os alunos ao carregar
      const alunosCalculados = dadosAlunosRaw.map((aluno) => {
        const calculos = calcularStatusAluno(
          aluno.notas || [],
          dadosConfig,
          aluno.totalPresencas || 0,
          aluno.aulas_planejadas || 30,
        );
        return { ...aluno, ...calculos };
      });

      setConfiguracoes(dadosConfig);
      setAlunos(alunosCalculados);

      if (dadosConfig.length > 0) {
        setTempConfig(dadosConfig);
      }
    } catch (err) {
      console.error("Erro ao buscar dados da pauta:", err);
    } finally {
      setCarregando(false);
    }
  };

  const salvarConfiguracao = async () => {
    if (!disciplinaId) return alert("ID da disciplina não encontrado.");
    const soma = tempConfig.reduce((acc, curr) => acc + Number(curr.peso), 0);
    if (soma !== 100)
      return alert("A soma dos pesos deve ser exatamente 100%!");

    try {
      const payload = {
        disciplinaId: disciplinaId,
        testes: tempConfig.map((t) => ({
          nome: t.nome.trim(),
          peso: Number(t.peso),
        })),
      };
      await api.post("/professor/configuracao-notas", payload);
      alert("Configuração salva com sucesso!");
      setEditandoPesos(false);
      carregarDados();
    } catch (err) {
      alert(err.response?.data?.erro || "Erro ao salvar");
    }
  };

  const handleSalvarNota = async (alunoId, configId, valor) => {
    if (valor === "") return;

    let notaNum = parseFloat(valor);

    // Validação estrita
    if (isNaN(notaNum)) return;

    if (notaNum > 100 || notaNum < 0) {
      alert("A nota deve estar entre 0 e 100%");
      // Opcional: recarregar os dados para resetar o input para o valor anterior
      return;
    }

    try {
      const payload = {
        notas: [
          {
            alunoId,
            disciplinaId,
            configuracaoId: configId,
            valor: notaNum,
            tipo: "TESTE",
          },
        ],
      };

      await api.post("/professor/notas", payload);
      setAlunos((prevAlunos) =>
        prevAlunos.map((aluno) => {
          if (aluno.id === alunoId) {
            let novasNotas = [...(aluno.notas || [])];

            const idx = novasNotas.findIndex(
              (n) => n.configuracaoId === configId,
            );
            if (idx > -1) novasNotas[idx].valor = notaNum;
            else novasNotas.push({ configuracaoId: configId, valor: notaNum });

            // Chama o utilitário sem lógica de exame
            const calculos = calcularStatusAluno(
              novasNotas,
              configuracoes,
              aluno.totalPresencas || 0,
              aluno.aulas_planejadas || 30,
            );

            return {
              ...aluno,
              notas: novasNotas,
              ...calculos,
            };
          }
          return aluno;
        }),
      );
    } catch (err) {
      console.error("Erro ao salvar nota", err);
    }
  };

  if (carregando)
    return (
      <div className="p-10 text-center font-semibold text-black">
        Carregando Pauta...
      </div>
    );

  return (
    <div className="p-6 bg-gray-50 min-h-screen text-black">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Lançamento de Notas (%)
          </h1>
          <p className="text-sm text-gray-500">
            Mínimo 50% para Aprovação • Presença Mínima 80%
          </p>
        </div>
        <button
          onClick={() => setEditandoPesos(!editandoPesos)}
          className={`px-4 py-2 rounded shadow transition ${editandoPesos ? "bg-red-500" : "bg-blue-600"} text-white`}
        >
          {editandoPesos ? "Cancelar" : "Configurar Pesos"}
        </button>
      </div>

      {editandoPesos && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8 border-t-4 border-blue-500">
          <h2 className="text-lg font-semibold mb-4 text-blue-800">
            Estrutura de Avaliação
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tempConfig.map((item, index) => (
              <div
                key={index}
                className="flex gap-2 items-center bg-gray-50 p-2 rounded"
              >
                <input
                  className="border p-2 rounded w-full outline-none"
                  placeholder="Nome do Teste"
                  value={item.nome}
                  onChange={(e) => {
                    const newC = [...tempConfig];
                    newC[index].nome = e.target.value;
                    setTempConfig(newC);
                  }}
                />
                <input
                  type="number"
                  className="border p-2 rounded w-20 text-center"
                  value={item.peso}
                  onChange={(e) => {
                    const newC = [...tempConfig];
                    newC[index].peso = e.target.value;
                    setTempConfig(newC);
                  }}
                />
                <span className="text-gray-500">%</span>
                <button
                  onClick={() =>
                    setTempConfig(tempConfig.filter((_, i) => i !== index))
                  }
                  className="text-red-500 px-2"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3 border-t pt-4">
            <button
              onClick={() =>
                setTempConfig([...tempConfig, { nome: "", peso: 0 }])
              }
              className="bg-gray-200 px-4 py-2 rounded"
            >
              + Adicionar Teste
            </button>
            <button
              onClick={salvarConfiguracao}
              className="bg-green-600 text-white px-8 py-2 rounded font-bold"
            >
              Gravar Pesos
            </button>
            <button
              onClick={exportarExcel}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow transition flex items-center gap-2"
            >
              📊 Exportar Excel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg overflow-x-auto border border-gray-200">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="p-4">Estudante / Frequência</th>
              {configuracoes.map((c) => (
                <th
                  key={c.id}
                  className="p-4 text-center border-l border-gray-700"
                >
                  {c.nome} <br />
                  <span className="text-[10px] text-blue-300">{c.peso}%</span>
                </th>
              ))}
              <th className="p-4 bg-blue-900 text-center border-l border-gray-700">
                Média Final (%)
              </th>
              <th className="p-4 bg-gray-900 text-center border-l border-gray-700">
                Resultado
              </th>
            </tr>
          </thead>
          <tbody>
            {alunos.map((aluno) => {
              const freqBaixa = Number(aluno.percPresenca) < 80;
              return (
                <tr
                  key={aluno.id}
                  className={`border-b hover:bg-blue-50 ${freqBaixa ? "bg-red-50" : ""}`}
                >
                  <td className="p-4">
                    <div className="font-bold text-gray-700">{aluno.nome}</div>
                    <div
                      className={`text-[10px] font-bold ${freqBaixa ? "text-red-600" : "text-green-600"}`}
                    >
                      Frequência: {aluno.percPresenca || 0}%
                    </div>
                  </td>

                  {configuracoes.map((conf) => (
                    <td key={conf.id} className="p-4 text-center border-l">
                      <input
                        type="number"
                        placeholder="0-100"
                        className="w-16 border rounded p-1.5 text-center"
                        defaultValue={
                          aluno.notas?.find((n) => n.configuracaoId === conf.id)
                            ?.valor || ""
                        }
                        onBlur={(e) =>
                          handleSalvarNota(aluno.id, conf.id, e.target.value)
                        }
                      />
                    </td>
                  ))}

                  <td className="p-4 text-center font-black bg-blue-50 text-blue-900 border-l">
                    {aluno.mf ? `${aluno.mf}%` : "0%"}
                  </td>

                  <td
                    className={`p-4 text-center font-bold border-l ${aluno.statusFinal?.includes("Alcançou") ? "text-green-700" : "text-red-600"}`}
                  >
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] uppercase ${aluno.statusFinal?.includes("Alcançou") ? "bg-green-100" : "bg-red-100"}`}
                    >
                      {aluno.statusFinal || "Pendente"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PainelNotas;
