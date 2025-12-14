import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',  // Use absolute paths for production
  publicDir: 'public',  // Copy public assets to dist
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Ensure the entry point is correct
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  server: {
    port: 5173
  }
});