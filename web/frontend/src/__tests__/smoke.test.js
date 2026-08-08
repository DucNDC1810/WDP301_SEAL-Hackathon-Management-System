import { describe, it, expect } from 'vitest';

describe('vitest wiring', () => {
  it('runs ESM tests in the frontend package', () => {
    expect(typeof window).toBe('object');
  });
});
