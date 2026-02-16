const { Configuracao, Curso, Turma } = require("../models");
const sequelize = require("../config/database");

exports.obterConfiguracao = async (req, res) => {
  try {
    const config = await Configuracao.findOne({
      // Trazemos os Cursos e, dentro deles, as Turmas vinculadas
      include: [
        { 
          model: Curso, 
          as: "cursos",
          include: [{ model: Turma, as: "turmas" }] 
        }
      ],
    });

    if (!config) {
      return res.status(200).json({
        nome_instituicao: "",
        tipo_ensino: "Secundário",
        cursos: [],
      });
    }

    res.json(config);
  } catch (error) {
    console.error("Erro ao buscar configuração:", error);
    res.status(500).json({ erro: "Erro interno no servidor" });
  }
};

exports.salvarConfiguracao = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    // 1. Atualizar/Criar Configuração Base
    let config = await Configuracao.findOne({ transaction: t });
    
    if (!config) {
      config = await Configuracao.create({ ...req.body }, { transaction: t });
    } else {
      await config.update(req.body, { transaction: t });
    }

    // 2. Processar Cursos
    if (req.body.cursos && Array.isArray(req.body.cursos)) {
      
      for (const cursoData of req.body.cursos) {
        // A. Cria ou Atualiza o Curso
        // Nota: O findOrCreate busca pelo nome E configId
        const [curso] = await Curso.findOrCreate({
          where: { nome: cursoData.nome, configuracaoId: config.id },
          defaults: { ...cursoData, configuracaoId: config.id },
          transaction: t,
        });

        // Se o curso já existia, atualizamos o regime caso tenha mudado
        await curso.update({ regime: cursoData.regime }, { transaction: t });

        // B. Processar Turmas VINCULADAS a este Curso
        if (cursoData.turmas && Array.isArray(cursoData.turmas)) {
          for (const turmaData of cursoData.turmas) {
            await Turma.findOrCreate({
              where: { 
                nome: turmaData.nome, 
                cursoId: curso.id, // Vínculo essencial
                configuracaoId: config.id 
              },
              defaults: { 
                ...turmaData, 
                cursoId: curso.id, 
                configuracaoId: config.id 
              },
              transaction: t,
            });
            // Nota: Se quiser atualizar vagas/turno de turma existente, adicione um update aqui igual fiz no curso
          }
        }
      }
    }

    await t.commit();

    // 3. Retornar dados atualizados para o Frontend
    const configAtualizada = await Configuracao.findByPk(config.id, {
      include: [
        { 
          model: Curso, 
          as: "cursos",
          include: [{ model: Turma, as: "turmas" }] 
        }
      ],
    });

    return res.json({
      mensagem: "Estrutura salva com sucesso!",
      config: configAtualizada,
    });

  } catch (error) {
    if (t) await t.rollback();
    console.error("Erro ao salvar:", error);
    res.status(400).json({ erro: "Falha ao processar dados", detalhes: error.message });
  }
};