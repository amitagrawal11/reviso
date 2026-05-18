import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Stub plugin: resolves `*?inline` (CSS-as-string) imports to an empty string
// so modules like inject-styles.ts and hljs-theme.tsx don't fail under Vitest.
const inlineStub = {
  name: 'inline-css-stub',
  enforce: 'pre' as const,
  resolveId(source: string) {
    if (source.endsWith('?inline')) return '\0' + source;
    return null;
  },
  load(id: string) {
    if (id.startsWith('\0') && id.endsWith('?inline')) return 'export default "";';
    return null;
  },
};

export default defineConfig({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: [inlineStub as any, react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/Setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/**', 'node_modules/**', 'dist/**'],
    server: {
      deps: {
        inline: [/@uiw\/react-md-editor/, /lucide-react/, /@mantine/],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/test/**',
        'src/app/main.tsx',
        'src/app/App.tsx',
        'src/vite-env.d.ts',
        'src/mock/SeedData.ts',
        // Type-only re-export module — no runtime to cover.
        'src/features/notes/repository/NoteRepositoryTypes.ts',
        // Pure module-init bootstrap (createClient) — exercised everywhere but
        // the no-env warn branch needs a separate module-reset suite that
        // conflicts with the global supabase mock. Excluded for simplicity.
        'src/features/authentication/api/SupabaseClient.ts',
      ],
    },
  },
});
