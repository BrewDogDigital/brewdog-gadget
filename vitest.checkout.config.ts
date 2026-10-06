import {defineConfig} from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'preact',
  },
  ssr: {
    noExternal: ['@shopify/ui-extensions-tester'],
  },
  test: {
    environment: 'jsdom',
    include: ['extensions/**/tests/**/*.test.ts'],
    isolate: true,
    server: {
      deps: {
        inline: ['@shopify/ui-extensions-tester'],
      },
    },
  },
});
