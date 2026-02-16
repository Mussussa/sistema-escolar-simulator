// config/gradeConfig.js

module.exports = {
  Manhã: {
    inicio: "07:00",
    duracao_aula: 45, // minutos
    intervalos: [
      { apos_tempo: 2, duracao: 15 }, // Recreio maior depois da 2ª aula
      { apos_tempo: 4, duracao: 5 }   // Troca rápida depois da 4ª aula
    ]
  },
  Tarde: {
    inicio: "12:30",
    duracao_aula: 45,
    intervalos: [
      { apos_tempo: 2, duracao: 15 },
      { apos_tempo: 4, duracao: 5 }
    ]
  },
  Noite: {
    inicio: "18:00",
    duracao_aula: 40, // Aulas da noite costumam ser mais curtas
    intervalos: [
      { apos_tempo: 2, duracao: 10 }
    ]
  }
};