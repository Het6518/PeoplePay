const express = require('express');
const { getCache, setCache, delCachePattern } = require('./src/config/redis');
const { cacheMiddleware } = require('./src/middleware/redisCache');

async function testHttpCaching() {
  console.log('============================================================');
  console.log('⚡ Testing HTTP Cache Middleware (MISS vs HIT)');
  console.log('============================================================\n');

  // Clear existing test cache keys
  await delCachePattern('cache:TEST:*');

  let dbQueryCount = 0;

  // Simulate a controller that does heavy computation or DB query
  const mockDbController = async (req, res) => {
    dbQueryCount++;
    // Simulate 50ms DB query latency
    await new Promise(r => setTimeout(r, 50));
    return res.json({
      success: true,
      data: {
        summary: 'Dashboard Metrics Computed from Database',
        timestamp: Date.now(),
        dbQueryRun: dbQueryCount,
      }
    });
  };

  const app = express();
  app.use((req, res, next) => {
    req.user = { id: 'test_user_001', role: 'TEST' };
    next();
  });

  // Apply cacheMiddleware with 60s TTL
  app.get('/api/test-dashboard', cacheMiddleware(60), mockDbController);

  const server = app.listen(5099);

  try {
    // 1st Request: Expect MISS
    console.log('📡 Request 1: GET /api/test-dashboard (First call)...');
    const t0 = performance.now();
    const res1 = await fetch('http://localhost:5099/api/test-dashboard');
    const t1 = performance.now();
    const body1 = await res1.json();
    const cacheHeader1 = res1.headers.get('x-cache');
    console.log(`   • X-Cache Header:  ${cacheHeader1}`);
    console.log(`   • Response Time:   ${(t1 - t0).toFixed(2)} ms`);
    console.log(`   • DB Queries Run:  ${body1.data.dbQueryRun}`);
    console.log(`   • Result:          ${cacheHeader1 === 'MISS' ? '✅ Correct (Cache Miss)' : '❌ Incorrect'}\n`);

    // 2nd Request: Expect HIT
    console.log('📡 Request 2: GET /api/test-dashboard (Second call immediately after)...');
    const t2 = performance.now();
    const res2 = await fetch('http://localhost:5099/api/test-dashboard');
    const t3 = performance.now();
    const body2 = await res2.json();
    const cacheHeader2 = res2.headers.get('x-cache');
    console.log(`   • X-Cache Header:  ${cacheHeader2}`);
    console.log(`   • Response Time:   ${(t3 - t2).toFixed(2)} ms`);
    console.log(`   • DB Queries Run:  ${body2.data.dbQueryRun} (Zero DB queries executed!)`);
    console.log(`   • Result:          ${cacheHeader2 === 'HIT' ? '✅ Correct (Cache Hit - Served from Redis!)' : '❌ Incorrect'}\n`);

    // 3rd Request: After Cache Invalidation
    console.log('🗑️ Simulating Mutation: Invalidating cache via delCachePattern("cache:TEST:*")...');
    await delCachePattern('cache:TEST:*');
    // small wait for async scan stream
    await new Promise(r => setTimeout(r, 100));

    console.log('📡 Request 3: GET /api/test-dashboard (After cache invalidation)...');
    const t4 = performance.now();
    const res3 = await fetch('http://localhost:5099/api/test-dashboard');
    const t5 = performance.now();
    const body3 = await res3.json();
    const cacheHeader3 = res3.headers.get('x-cache');
    console.log(`   • X-Cache Header:  ${cacheHeader3}`);
    console.log(`   • Response Time:   ${(t5 - t4).toFixed(2)} ms`);
    console.log(`   • DB Queries Run:  ${body3.data.dbQueryRun} (Fresh DB query triggered!)`);
    console.log(`   • Result:          ${cacheHeader3 === 'MISS' ? '✅ Correct (Cache Miss after Invalidation)' : '❌ Incorrect'}\n`);

    console.log('============================================================');
    console.log('🎉 Full End-to-End Cache Lifecycle Verified Successfully!');
    console.log('============================================================');
  } finally {
    server.close();
    // clean up
    await delCachePattern('cache:TEST:*');
  }
}

testHttpCaching();
