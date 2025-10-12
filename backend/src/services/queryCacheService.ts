/**
 * Query Cache Service
 * Provides in-memory caching for frequently-accessed database queries
 * Reduces database load for read-heavy operations
 */

import logger from '../utils/logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
}

export class QueryCacheService {
  private static cache = new Map<string, CacheEntry<any>>();
  private static readonly DEFAULT_TTL = 60000; // 1 minute default
  
  /**
   * Get cached query result
   * @param key Unique cache key for the query
   * @param ttl Time to live in milliseconds (default: 60000 = 1 minute)
   * @returns Cached data or null if not found/expired
   */
  static get<T>(key: string, ttl: number = this.DEFAULT_TTL): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      logger.debug(`Cache miss: ${key}`);
      return null;
    }
    
    // Check if expired
    if (Date.now() - entry.timestamp > ttl) {
      logger.debug(`Cache expired: ${key}`, { age: `${Date.now() - entry.timestamp}ms`, ttl: `${ttl}ms` });
      this.cache.delete(key);
      return null;
    }
    
    // Cache hit
    entry.hits++;
    logger.debug(`Cache hit: ${key}`, { hits: entry.hits, age: `${Date.now() - entry.timestamp}ms` });
    return entry.data as T;
  }
  
  /**
   * Set cached query result
   * @param key Unique cache key for the query
   * @param data Data to cache
   */
  static set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0
    });
    logger.debug(`Cache set: ${key}`, { size: this.cache.size });
  }
  
  /**
   * Invalidate (delete) a specific cache entry
   * @param key Cache key to invalidate
   */
  static invalidate(key: string): void {
    const deleted = this.cache.delete(key);
    if (deleted) {
      logger.debug(`Cache invalidated: ${key}`);
    }
  }
  
  /**
   * Invalidate all cache entries matching a pattern
   * @param pattern Regular expression or string to match keys
   */
  static invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    let deleted = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    
    if (deleted > 0) {
      logger.info(`Cache invalidated by pattern: ${pattern}`, { deletedCount: deleted });
    }
  }
  
  /**
   * Clear all cache entries
   */
  static clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info('Query cache cleared', { entriesCleared: size });
  }
  
  /**
   * Get cache statistics
   */
  static getStats(): {
    size: number;
    entries: Array<{ key: string; age: number; hits: number }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: Date.now() - entry.timestamp,
      hits: entry.hits
    }));
    
    return {
      size: this.cache.size,
      entries
    };
  }
  
  /**
   * Helper: Generate cache key for query with params
   * @param queryName Name/identifier for the query
   * @param params Parameters used in the query
   * @returns Cache key string
   */
  static generateKey(queryName: string, ...params: any[]): string {
    return `${queryName}:${JSON.stringify(params)}`;
  }
  
  /**
   * Wrapper function to cache query results automatically
   * @param key Cache key
   * @param queryFn Function that executes the query
   * @param ttl Time to live in milliseconds
   * @returns Query result (from cache or fresh)
   */
  static async cached<T>(
    key: string,
    queryFn: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    // Try cache first
    const cached = this.get<T>(key, ttl);
    if (cached !== null) {
      return cached;
    }
    
    // Execute query
    const result = await queryFn();
    
    // Store in cache
    this.set(key, result);
    
    return result;
  }
}

