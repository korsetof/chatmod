import { build } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function buildFrontend() {
  try {
    await build({
      root: path.resolve(__dirname, 'client'),
      plugins: [react()],
      build: {
        outDir: path.resolve(__dirname, 'dist/public'),
        emptyOutDir: true,
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'client/src'),
          '@shared': path.resolve(__dirname, 'shared'),
          '@assets': path.resolve(__dirname, 'attached_assets'),
        },
      },
    });
    console.log('Frontend build completed successfully');
  } catch (error) {
    console.error('Frontend build failed:', error);
    process.exit(1);
  }
}

buildFrontend(); 