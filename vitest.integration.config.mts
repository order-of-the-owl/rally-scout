import { defineConfig } from 'vitest/config';

// Fixed to local Docker so these tests can never write to a deployed database.
process.env.DATABASE_URL = 'postgresql://rally_scout:rally_scout@localhost:5432/rally_scout';

export default defineConfig({
  resolve: {
    alias: { '@': import.meta.dirname },
  },
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    globalSetup: ['tests/integration/global-setup.ts'],
  },
});
