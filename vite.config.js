import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app.html'),
        auth: resolve(__dirname, 'auth.html')
      },
      output: {
        manualChunks(id) {
          if (id.includes('firebase')) {
            return 'vendor-firebase';
          }
          if (id.includes('gsap')) {
            return 'vendor-gsap';
          }
          if (id.includes('ogl')) {
            return 'vendor-ogl';
          }
        }
      }
    }
  }
});
