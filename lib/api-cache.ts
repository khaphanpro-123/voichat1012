// Simple in-memory cache for API responses
// Reduces redundant DB queries for same data within a short window

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

class ApiCache {
  private store = new Map<string, CacheEntry<any>>()
  private maxSize = 100

  set<T>(key: string, data: T, ttlMs = 30_000): void {
    // Evict oldest if at capacity
    if (this.store.size >= this.maxSize) {
      const firstKey = this.store.keys().next().value
      if (firstKey) this.store.delete(firstKey)
    }
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs })
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
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
}

// Singleton — shared across all API route handlers in same serverless instance
const globalCache = (global as any).__apiCache ?? new ApiCache()
;(global as any).__apiCache = globalCache

export default globalCache
