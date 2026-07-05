interface RateLimitRecord {
  count: number;
  timestamp: number;
}

const store = new Map<string, RateLimitRecord>();

/**
 * Basic in-memory rate limiter.
 * Note: Since this is stored in memory, limits reset when the server restarts,
 * and it does not sync across multiple serverless functions/instances.
 * For a self-hosted single-instance deployment, this is sufficient.
 * 
 * @param key Unique identifier (e.g., user ID + action)
 * @param limit Max requests allowed in the window
 * @param windowMs Time window in milliseconds
 * @returns true if allowed, false if rate limited
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = store.get(key);

  if (!record) {
    store.set(key, { count: 1, timestamp: now });
    return true;
  }

  if (now - record.timestamp > windowMs) {
    // Window expired, reset
    store.set(key, { count: 1, timestamp: now });
    return true;
  }

  if (record.count >= limit) {
    return false; // Rate limited
  }

  record.count++;
  return true;
}

// Cleanup old records periodically to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      // Assuming a max window of 1 hour (3600000ms) for cleanup
      if (now - record.timestamp > 3600000) {
        store.delete(key);
      }
    }
  }, 60000).unref?.(); // Use unref if available (Node.js) so it doesn't block exit
}
