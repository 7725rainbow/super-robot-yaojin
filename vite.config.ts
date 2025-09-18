import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  if (command === 'build') {
    // Production build ('npm run build') configuration
    return {
      plugins: [react()],
      // The `base` property:
      // If your application is deployed to a root path like 'https://your-app.vercel.app/',
      // there's no need to set `base` or it should be set to `'/'`.
      // It's recommended to remove it when deploying to Vercel's root domain,
      // especially if it was previously set for GitHub Pages sub-path deployment.
      // base: '/', 
      
      build: {
        outDir: 'dist', 
        sourcemap: false, 
      },
    };
  } else {
    // Development mode ('npm run dev') configuration
    return {
      plugins: [react()],
      server: {
        // Since the Gemini API SDK is called directly on the client-side,
        // a proxy is not needed for this application's setup.
        port: 5173, 
      },
    };
  }
});