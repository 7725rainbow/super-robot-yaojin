import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  if (command === 'build') {
    // 生产构建 ('npm run build') 配置
    return {
      plugins: [react()],
      

      build: {
        outDir: 'dist',
        sourcemap: false, // 生产构建中禁用 source map 以减少文件大小
        
        // 如果遇到 Rollup 无法解析特定依赖的问题，可以尝试在这里将其外部化
        // 例如：
        // rollupOptions: {
        //   external: ['@google/generative-ai']
        // }
      },
    };
  } else {
    // 开发模式 ('npm run dev') 配置
    return {
      plugins: [react()],
      server: {
        port: 5173,
      },
    };
  }
});
