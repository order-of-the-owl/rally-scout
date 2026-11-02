import { describe, expect, it } from 'vitest';

import nextConfig from '@/next.config';

describe('test setup', () => {
  it('resolves the @ path alias', () => {
    expect(nextConfig).toBeTypeOf('object');
  });
});
