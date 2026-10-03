import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3001,
    proxy: {
      '/api': {
        target: process.env.VITE_DASHBOARD_BACKEND_URL || 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/agent': {
        target: process.env.VITE_CLIENT_AGENT_URL || 'http://192.168.56.101:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/agent/, ''),
      },
      '/experiments-proxy': {
        target: process.env.VITE_CLIENT_EXPERIMENT_URL || 'http://192.168.56.101:8010',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/experiments-proxy/, ''),
      },
      '/server-agent': {
        target: process.env.VITE_SERVER_AGENT_URL || 'http://192.168.56.102:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/server-agent/, ''),
      },
    },
  },
});
