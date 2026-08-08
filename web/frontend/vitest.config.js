import { defineConfig } from 'vitest/config';

// Vitest reads this instead of vite.config.js so the app build stays untouched.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx}'],
    globals: false,
  },
});
