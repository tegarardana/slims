import { LRUCache } from 'lru-cache';

/**
 * TECHNICAL DEBT / ARCHITECTURE NOTE:
 * This is an in-memory rate limiter using LRU cache.
 * Limitation: It is NOT effective in a serverless, multi-instance environment (e.g. Vercel)
 * because Vercel functions do not share memory between invocations and memory is reset
 * upon container scale-out or restart. 
 * 
 * TODO: Upgrade to a Redis-based solution (e.g., @upstash/ratelimit) before production scale-out.
 */

type Options = {
  uniqueTokenPerInterval?: number;
  interval?: number;
};

export default function rateLimit(options?: Options) {
  const tokenCache = new LRUCache({
    max: options?.uniqueTokenPerInterval || 500,
    ttl: options?.interval || 60000,
  });

  return {
    check: (limit: number, token: string) => {
      const tokenCount = (tokenCache.get(token) as number[]) || [0];
      if (tokenCount[0] === 0) {
        tokenCache.set(token, [1]);
      } else {
        tokenCount[0] += 1;
        tokenCache.set(token, tokenCount);
      }
      return tokenCount[0] <= limit;
    },
  };
}

export const authLimiter = rateLimit({ interval: 15 * 60 * 1000, uniqueTokenPerInterval: 500 }); // 15 mins
export const apiLimiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 1000 }); // 1 min

export function checkRateLimit(ip: string, type: 'AUTH' | 'API', limit: number) {
  const limiter = type === 'AUTH' ? authLimiter : apiLimiter;
  const isAllowed = limiter.check(limit, ip);
  return { success: isAllowed };
}
