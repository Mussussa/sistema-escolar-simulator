import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/api', 
  withCredentials: true // O navegador anexa o cookie com o token automaticamente!
});

// --- INTERCEPTOR DE RESPOSTA (Para lidar com a sessão expirada) ---
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Se o backend devolver 401 (token expirado no cookie ou ausente)
    if (error.response && error.response.status === 401) {
      console.warn("⚠️ Sessão expirada. Redirecionando para o login...");
      
      // Limpa os dados do usuário (nome, role, etc) que ainda estão no localStorage
      localStorage.clear(); 
      
      // Redireciona para o login
      window.location.href = "/login";
    }
    
    return Promise.reject(error);
  }
);

export default api;