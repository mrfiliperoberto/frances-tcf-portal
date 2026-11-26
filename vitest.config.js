import { defineConfig } from 'vitest/config';

// Config separada do vite.config.js para não carregar o plugin PWA nos testes.
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{js,jsx}'],
    setupFiles: ['tests/setup.js'],
    restoreMocks: true
  }
});
