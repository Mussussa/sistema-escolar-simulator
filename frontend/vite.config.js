import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Isto permite que qualquer dispositivo na tua rede aceda ao Vite
    port: 5173,      // Podes manter a porta padrão
  }
});