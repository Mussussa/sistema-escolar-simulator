// backend/utils/calculadoraHorarios.js

const regrasPeriodo = {
  "Manhã": { inicio: "07:00", duracao: 50, intervaloApos: 2, tempoIntervalo: 20 },
  "Tarde": { inicio: "13:00", duracao: 50, intervaloApos: 3, tempoIntervalo: 15 },
  "Noite": { inicio: "18:30", duracao: 45, intervaloApos: 2, tempoIntervalo: 10 },
};

const gerarHoraInicio = (periodo, ordemTempo) => {
  const config = regrasPeriodo[periodo] || regrasPeriodo["Manhã"];
  let [horas, minutos] = config.inicio.split(':').map(Number);
  
  let minutosTotais = (horas * 60) + minutos;

  // Calcula o acréscimo de tempo baseado na ordem da aula
  for (let i = 1; i < ordemTempo; i++) {
    minutosTotais += config.duracao;
    if (i === config.intervaloApos) {
      minutosTotais += config.tempoIntervalo;
    }
  }

  const h = Math.floor(minutosTotais / 60).toString().padStart(2, '0');
  const m = (minutosTotais % 60).toString().padStart(2, '0');
  
  return `${h}:${m}:00`;
};

module.exports = { gerarHoraInicio };