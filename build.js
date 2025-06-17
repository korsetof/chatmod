import { build } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function buildFrontend() {
  try {
    await build({
      configFile: false,
      root: path.resolve(__dirname, 'client'),
      plugins: [react()],
      build: {
        outDir: path.resolve(__dirname, 'dist/public'),
        emptyOutDir: true,
        sourcemap: true,
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'client/index.html')
          }
        }
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'client/src'),
          '@shared': path.resolve(__dirname, 'shared'),
          '@assets': path.resolve(__dirname, 'client/src/assets')
        }
      },
      server: {
        port: 3000,
        host: true
      }
    });
    console.log('Frontend build completed successfully');
  } catch (error) {
    console.error('Frontend build failed:', error);
    process.exit(1);
  }
}

buildFrontend(); 