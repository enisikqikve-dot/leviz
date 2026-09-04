import { beforeEach, describe, expect, it } from 'vitest';

import { rateLimiter } from './index';

describe('Rate-Limiting', () => {
  beforeEach(async () => {
    await rateLimiter.reset('test-schluessel');
  });

  it('laesst Versuche bis zur Grenze zu', async () => {
    for (let i = 0; i < 3; i += 1) {
      const result = await rateLimiter.check('test-schluessel', 3, 60_000);
      expect(result.success).toBe(true);
    }
  });

  it('blockt den Versuch ueber der Grenze', async () => {
    for (let i = 0; i < 3; i += 1) {
      await rateLimiter.check('test-schluessel', 3, 60_000);
    }
    const blocked = await rateLimiter.check('test-schluessel', 3, 60_000);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetAt).toBeGreaterThan(Date.now());
  });

  it('zaehlt die verbleibenden Versuche herunter', async () => {
    const first = await rateLimiter.check('test-schluessel', 5, 60_000);
    const second = await rateLimiter.check('test-schluessel', 5, 60_000);
    expect(first.remaining).toBe(4);
    expect(second.remaining).toBe(3);
  });

  it('haelt verschiedene Schluessel auseinander', async () => {
    await rateLimiter.check('test-schluessel', 1, 60_000);
    const other = await rateLimiter.check('anderer-schluessel', 1, 60_000);
    expect(other.success).toBe(true);
    await rateLimiter.reset('anderer-schluessel');
  });
});
