import { defineConfig } from 'vite';
import type { PluginOption } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue() as PluginOption],
  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ['echarts', 'vue-echarts']
        }
      }
    }
  },
  server: {
    host: '127.0.0.1',
    port: 5173
  }
});
