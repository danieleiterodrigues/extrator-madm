import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/imports': { target: 'http://127.0.0.1:8000', changeOrigin: true },
          '/upload': { target: 'http://127.0.0.1:8000', changeOrigin: true },
          '/records': { target: 'http://127.0.0.1:8000', changeOrigin: true },
          '/dashboard': { target: 'http://127.0.0.1:8000', changeOrigin: true },
          '/engine': { target: 'http://127.0.0.1:8000', changeOrigin: true },
          '/analyses': { target: 'http://127.0.0.1:8000', changeOrigin: true },
          '/settings': { target: 'http://127.0.0.1:8000', changeOrigin: true },
          '/users': { target: 'http://127.0.0.1:8000', changeOrigin: true },
          '/login': { target: 'http://127.0.0.1:8000', changeOrigin: true },
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
