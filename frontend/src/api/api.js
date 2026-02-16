import axios from 'axios';

const api = axios.create({
  // Troca o IP por localhost
  baseURL: 'https://ubuntu-web-solution-hila.onrender.com/api', 
  withCredentials: true // Isto é obrigatório para enviar/receber o cookie
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;