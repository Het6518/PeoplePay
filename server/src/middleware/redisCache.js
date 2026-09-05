/**
 * Express Middleware for Redis Caching
 * 
 * Intercepts GET requests and serves responses from Redis when cached.
 * On cache miss, captures response data and saves to Redis asynchronously.
 */

const { getCache, setCache } = require('../config/redis');

/**
 * Cache Middleware Factory
 * 
 * @param {number} ttlSeconds Time-to-live in seconds (default: 300)
 * @param {function(req): string} [customKeyFn] Optional custom cache key builder
 */
function cacheMiddleware(ttlSeconds = 300, customKeyFn = null) {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      // Build deterministic cache key
      let key;
      if (customKeyFn && typeof customKeyFn === 'function') {
        key = customKeyFn(req);
      } else {
        const userRole = req.user?.role || 'ANON';
        const userId = req.user?.id || 'GUEST';
        const url = req.originalUrl || req.url;
        key = `cache:${userRole}:${userId}:${url}`;
      }

      // Check Redis
      const cached = await getCache(key);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-TTL', `${ttlSeconds}s`);
        return res.json(cached);
      }

      // Cache Miss — hook into res.json to capture response
      res.setHeader('X-Cache', 'MISS');
      const originalJson = res.json.bind(res);

      res.json = (body) => {
        // Cache successful payloads (HTTP 200/201 or body.success === true)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          setCache(key, body, ttlSeconds).catch(() => {});
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      // If middleware fails, continue transparently to controller
      next();
    }
  };
}

module.exports = { cacheMiddleware };
