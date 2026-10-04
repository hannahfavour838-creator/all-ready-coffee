import "server-only";

/**
 * Sliding-window rate limiter (in-memory).
 * Suitable for a single instance. For multi-instance deployments swap the store for Redis/Upstash —
 * the interface (`limit(key, max, windowMs)`) stays the same.
 */
type Bucket = number[];
const g = globalThis as unknown as { __arcRate?: Map<string, Bucket> };
const store: Map<string, Bucket> = (g.__arcRate ??= new Map());

let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, v] of store) if (!v.length || now - v[v.length - 1]! > 3_600_000) store.delete(k);
}

export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  sweep(now);
  const bucket = (store.get(key) ?? []).filter((t) => now - t < windowMs);
  if (bucket.length >= max) {
    store.set(key, bucket);
    return { ok: false as const, retryAfterSeconds: Math.ceil((windowMs - (now - bucket[0]!)) / 1000) };
  }
  bucket.push(now);
  store.set(key, bucket);
  return { ok: true as const, remaining: max - bucket.length };
}

export function resetRateLimit(key: string) {
  store.delete(key);
}
