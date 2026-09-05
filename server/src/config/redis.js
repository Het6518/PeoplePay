/**
 * Redis Client & Cache Manager for PeoplePay360
 * 
 * Provides high-performance Redis caching with automatic failover
 * and graceful degradation. If Redis server is unreachable or offline,
 * the manager silently logs a warning and falls back to direct DB queries
 * without interrupting API operations.
 */

const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redisClient = null;
let isConnected = false;
let hasErrorLogged = false;

// Metrics
let cacheHits = 0;
let cacheMisses = 0;

try {
  redisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) {
        if (!hasErrorLogged) {
          console.warn('⚠️  Redis connection unavailable. Operating in Fallback Mode (Direct DB Queries).');
          hasErrorLogged = true;
        }
        return null; // stop retrying, fallback mode
      }
      return Math.min(times * 200, 1000);
    },
    lazyConnect: true,
  });

  redisClient.on('connect', () => {
    isConnected = true;
    hasErrorLogged = false;
    console.log('⚡ Connected to Redis Server successfully');
  });

  redisClient.on('ready', () => {
    isConnected = true;
  });

  redisClient.on('error', (err) => {
    isConnected = false;
    if (!hasErrorLogged) {
      console.warn(`⚠️  Redis Connection Warning: ${err.message}. Operating in DB Fallback Mode.`);
      hasErrorLogged = true;
    }
  });

  // Attempt async connect
  redisClient.connect().catch((err) => {
    isConnected = false;
  });
} catch (err) {
  console.warn('⚠️  Failed to initialize Redis client. Operating in DB Fallback Mode.');
  redisClient = null;
}

/**
 * Fetch cached JSON object by key
 * @param {string} key 
 * @returns {Promise<any|null>}
 */
async function getCache(key) {
  if (!redisClient || !isConnected) {
    cacheMisses++;
    return null;
  }
  try {
    const data = await redisClient.get(key);
    if (data) {
      cacheHits++;
      return JSON.parse(data);
    }
    cacheMisses++;
    return null;
  } catch (err) {
    cacheMisses++;
    return null;
  }
}

/**
 * Set cache with TTL in seconds
 * @param {string} key 
 * @param {any} value 
 * @param {number} ttlSeconds Default: 300 seconds (5 mins)
 */
async function setCache(key, value, ttlSeconds = 300) {
  if (!redisClient || !isConnected) return;
  try {
    const serialized = JSON.stringify(value);
    if (ttlSeconds > 0) {
      await redisClient.setex(key, ttlSeconds, serialized);
    } else {
      await redisClient.set(key, serialized);
    }
  } catch (err) {
    // Ignore cache set errors in fallback mode
  }
}

/**
 * Delete a specific key
 * @param {string} key 
 */
async function delCache(key) {
  if (!redisClient || !isConnected) return;
  try {
    await redisClient.del(key);
  } catch (err) {
    // Ignore errors
  }
}

/**
 * Non-blocking pattern deletion using SCAN
 * @param {string} pattern e.g. "cache:dashboard:*" or "cache:master:*"
 */
async function delCachePattern(pattern) {
  if (!redisClient || !isConnected) return;
  try {
    let stream = redisClient.scanStream({
      match: pattern,
      count: 100,
    });

    stream.on('data', (resultKeys) => {
      if (resultKeys.length > 0) {
        const pipeline = redisClient.pipeline();
        resultKeys.forEach((key) => pipeline.del(key));
        pipeline.exec();
      }
    });
  } catch (err) {
    // Ignore errors
  }
}

/**
 * Flush all cached entries
 */
async function flushAllCache() {
  if (!redisClient || !isConnected) return;
  try {
    await redisClient.flushdb();
  } catch (err) {
    // Ignore errors
  }
}

/**
 * Return Redis health, memory info, hit/miss metrics
 */
async function getRedisStatus() {
  const status = {
    connected: isConnected,
    mode: isConnected ? 'REDIS_ACTIVE' : 'DB_FALLBACK',
    redisUrl: REDIS_URL.replace(/\/\/.*@/, '//***@'), // sanitize credentials if present
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: (cacheHits + cacheMisses) > 0 
      ? `${((cacheHits / (cacheHits + cacheMisses)) * 100).toFixed(1)}%`
      : '0%',
    info: null,
    keyCount: 0,
  };

  if (redisClient && isConnected) {
    try {
      const dbSize = await redisClient.dbsize();
      status.keyCount = dbSize;
      const memoryInfo = await redisClient.info('memory');
      const usedMemoryMatch = memoryInfo.match(/used_memory_human:(.*)/);
      if (usedMemoryMatch) {
        status.usedMemory = usedMemoryMatch[1].trim();
      }
    } catch (err) {
      // ignore
    }
  }

  return status;
}

module.exports = {
  getCache,
  setCache,
  delCache,
  delCachePattern,
  flushAllCache,
  getRedisStatus,
};
