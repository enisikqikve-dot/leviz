import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Löst den @/* Alias aus der tsconfig auf, ohne zusätzliches Plugin.
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    include: ['**/*.test.{ts,tsx}'],
    // .claude/worktrees: Arbeitskopien, die Claude Code fuer Nebenaufgaben
    // anlegt -- eine zweite Fassung des ganzen Repos, samt Tests.
    exclude: ['node_modules', '.next', 'e2e', 'mobile', '.claude/**'],
  },
});
