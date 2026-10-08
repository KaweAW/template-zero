import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMemoryLimiter, hashKey, type RateLimitRule } from '../../lib/rate-limit';

const rule: RateLimitRule = { limit: 3, windowSeconds: 60 };

describe('createMemoryLimiter', () => {
  it('allows hits up to the limit and refuses the next one', () => {
    const limiter = createMemoryLimiter(() => 0);
    assert.equal(limiter.hit('a', rule), true);
    assert.equal(limiter.hit('a', rule), true);
    assert.equal(limiter.hit('a', rule), true);
    assert.equal(limiter.hit('a', rule), false);
    assert.equal(limiter.hit('a', rule), false);
  });

  it('counts every key separately', () => {
    const limiter = createMemoryLimiter(() => 0);
    for (let i = 0; i < 3; i += 1) limiter.hit('a', rule);
    assert.equal(limiter.hit('a', rule), false);
    assert.equal(limiter.hit('b', rule), true);
  });

  it('starts a new window once the old one has expired', () => {
    let time = 0;
    const limiter = createMemoryLimiter(() => time);
    for (let i = 0; i < 4; i += 1) limiter.hit('a', rule);
    assert.equal(limiter.hit('a', rule), false);

    time = 59_999;
    assert.equal(limiter.hit('a', rule), false, 'still inside the window');

    time = 60_000;
    assert.equal(limiter.hit('a', rule), true, 'window elapsed');
  });

  it('does not extend the window on refused hits', () => {
    let time = 0;
    const limiter = createMemoryLimiter(() => time);
    for (let i = 0; i < 10; i += 1) {
      time = i * 5_000;
      limiter.hit('a', rule);
    }
    time = 60_000; // 60 s after the FIRST hit
    assert.equal(limiter.hit('a', rule), true);
  });

  it('never tracks more keys than its cap', () => {
    const limiter = createMemoryLimiter(() => 0);
    for (let i = 0; i < 6000; i += 1) limiter.hit(`key-${i}`, rule);
    assert.ok(limiter.size() <= 5000);
  });
});

describe('hashKey', () => {
  it('is stable, case-insensitive and hides the original value', () => {
    const a = hashKey('email', 'Guest@Example.com ');
    const b = hashKey('email', 'guest@example.com');
    assert.equal(a, b);
    assert.ok(!a.includes('guest'));
    assert.match(a, /^rl:email:[0-9a-f]{32}$/);
  });

  it('separates scopes', () => {
    assert.notEqual(hashKey('ip', '1.2.3.4'), hashKey('email', '1.2.3.4'));
  });
});
