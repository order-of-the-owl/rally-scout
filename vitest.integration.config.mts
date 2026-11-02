import { defineConfig } from 'vitest/config';

// Fixed to local Docker so these tests can never write to a deployed database.
process.env.DATABASE_URL = 'postgresql://rally_scout:rally_scout@localhost:5432/rally_scout';
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_integration';
process.env.CLERK_SECRET_KEY = 'sk_test_integration';
process.env.AI_API_KEY = 'integration-tests-never-call-the-provider';
process.env.AI_RATE_LIMIT_PER_HOUR = '5';

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
