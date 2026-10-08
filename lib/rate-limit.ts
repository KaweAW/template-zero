import { createHash } from 'node:crypto';

/**
 * Small rate limiter for the booking Server Action.
 *
 * Why it exists: the form sends an email to the restaurant and, optionally, a receipt to an
 * address typed by the visitor. Without limits, anyone could script requests to flood the
 * restaurant's inbox or to mail strangers from the restaurant's domain (which also damages the
 * sender reputation of that domain in Resend).
 *
 * Two backends, same behaviour:
 *   1. Upstash Redis (REST API, no SDK) when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 *      are set. Counters are shared by every serverless instance, so the limits are reliable.
 *   2. In-memory fallback. Counters live in one server instance only: on serverless platforms
 *      each warm instance has its own, so this slows a naive script down but does not stop a
 *      determined one. It is a safety net, not a substitute for configuring Redis on a live site.
 *
 * Keys are hashed before they are stored, so neither backend ever sees an IP address or an email.
 * This file must stay free of "@/" imports so the unit tests can load it directly.
 */

export interface RateLimitRule {
  /** Maximum number of allowed hits inside the window. */
  limit: number;
  /** Window length in seconds (fixed window, starting at the first hit). */
  windowSeconds: number;
}

export const RATE_LIMITS = {
  /** One visitor (IP address): booking requests that pass validation. */
  perIp: { limit: 5, windowSeconds: 10 * 60 },
  /** One recipient address: guest receipts. Protects third parties from being mailed. */
  perGuestEmail: { limit: 2, windowSeconds: 60 * 60 },
  /** The whole site: guest receipts. Caps the damage of a distributed attack. */
  allGuestReceipts: { limit: 50, windowSeconds: 60 * 60 },
} as const satisfies Record<string, RateLimitRule>;

interface Bucket {
  count: number;
  resetAt: number;
}

const MAX_TRACKED_KEYS = 5000;

/** In-memory fixed-window limiter. The clock is injectable so tests do not have to wait. */
export function createMemoryLimiter(now: () => number = Date.now) {
  const buckets = new Map<string, Bucket>();

  return {
    /** Records a hit. Returns true when it is allowed, false when the limit is exceeded. */
    hit(key: string, rule: RateLimitRule): boolean {
      const time = now();

      if (buckets.size >= MAX_TRACKED_KEYS) {
        for (const [k, bucket] of buckets) if (bucket.resetAt <= time) buckets.delete(k);
        // Still full of live buckets (an attack): drop the oldest rather than grow without bound.
        if (buckets.size >= MAX_TRACKED_KEYS) {
          const oldest = buckets.keys().next().value;
          if (oldest !== undefined) buckets.delete(oldest);
        }
      }

      const current = buckets.get(key);
      if (!current || current.resetAt <= time) {
        buckets.set(key, { count: 1, resetAt: time + rule.windowSeconds * 1000 });
        return rule.limit >= 1;
      }
      current.count += 1;
      return current.count <= rule.limit;
    },
    size: () => buckets.size,
  };
}

const memory = createMemoryLimiter();

/** Hashes a raw value (IP, email) so it is never stored in clear text. */
export function hashKey(scope: string, value: string): string {
  const digest = createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
  return `rl:${scope}:${digest.slice(0, 32)}`;
}

async function hitRedis(key: string, rule: RateLimitRule): Promise<boolean | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      // INCR creates the key at 1; EXPIRE ... NX sets the window only on the first hit.
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, String(rule.windowSeconds), 'NX'],
      ]),
      signal: AbortSignal.timeout(1500),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Upstash answered ${response.status}`);
    const results = (await response.json()) as Array<{ result?: number; error?: string }>;
    const count = results[0]?.result;
    if (typeof count !== 'number') throw new Error(results[0]?.error ?? 'unexpected response');
    return count <= rule.limit;
  } catch (error) {
    // Redis down or misconfigured: fall back to memory instead of blocking real guests.
    console.error('[rate-limit] Redis unavailable, using the in-memory limiter:', error);
    return null;
  }
}

/**
 * Returns true when the action may go ahead, false when the limit is exceeded.
 * `scope` and `value` are hashed together into the storage key.
 */
export async function checkRateLimit(
  scope: string,
  value: string,
  rule: RateLimitRule,
): Promise<boolean> {
  const key = hashKey(scope, value);
  const viaRedis = await hitRedis(key, rule);
  return viaRedis ?? memory.hit(key, rule);
}
