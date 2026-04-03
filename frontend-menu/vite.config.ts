import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        ws: true,
      },
      '/media': 'http://localhost:8787',
    },
  },
});
