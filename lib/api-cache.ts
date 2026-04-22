interface CacheEntry<T> {
  data: T
  expiresAt: number
  lastAccessed: number
}
class ApiCache {
  private store = new Map<string, CacheEntry<any>>()
  private maxSize = 500 // Increased for concurrent users

  set<T>(key: string, data: T, ttlMs = 30_000): void {
    // LRU eviction: remove least recently accessed if at capacity
    if (this.store.size >= this.maxSize) {
      let oldestKey = ""
      let oldestAccess = Infinity
      for (const [k, v] of this.store.entries()) {
        if (v.lastAccessed < oldestAccess) {
          oldestAccess = v.lastAccessed
          oldestKey = k
        }
      }
      if (oldestKey) this.store.delete(oldestKey)
    }
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs, lastAccessed: Date.now() })
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    entry.lastAccessed = Date.now() // Update LRU timestamp
    return entry.data as T
  }

  invalidate(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key)
    }
  }

  clear(): void {
    this.store.clear()
  }

  // Cleanup expired entries periodically
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) this.store.delete(key)
    }
  }
}

// Singleton — shared across all API route handlers in same serverless instance
const globalCache = (global as any).__apiCache ?? new ApiCache()
;(global as any).__apiCache = globalCache

// Cleanup every 5 minutes
if (!(global as any).__apiCacheCleanup) {
  ;(global as any).__apiCacheCleanup = setInterval(() => globalCache.cleanup(), 5 * 60 * 1000)
}

export default globalCache
