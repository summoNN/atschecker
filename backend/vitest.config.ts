import { defineConfig } from 'vitest/config';

// Keep the default suite offline even when a developer has a local provider key.
// Set RUN_GEMINI_TESTS=true explicitly for the optional real-provider test.
if (process.env.RUN_GEMINI_TESTS !== 'true') {
  process.env.AI_PROVIDER = 'none';
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
