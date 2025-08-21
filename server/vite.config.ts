import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { InlineConfig } from 'vitest';
import { UserConfig } from 'vite';

interface VitestConfigExport extends UserConfig {
  test: InlineConfig;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GOOGLE_GEMINI_BASE_URL': JSON.stringify(
        env.GOOGLE_GEMINI_BASE_URL
      ),
    },
    publicDir: 'public',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    test: {
      environment: 'jsdom',
    },
  } as VitestConfigExport;
});
