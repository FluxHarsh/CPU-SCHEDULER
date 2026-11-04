import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { compression } from 'vite-plugin-compression2';

export default defineConfig({
  plugins: [react(), compression({ algorithms: ['gzip', 'brotliCompress'], exclude: [/\.(png|jpe?g|woff2?)$/i] })],
  server: { proxy: { '/api': 'http://localhost:3000' } },
  build: { target: ['es2020', 'chrome87', 'safari14', 'firefox78', 'edge88'], cssCodeSplit: true, reportCompressedSize: true },
});
