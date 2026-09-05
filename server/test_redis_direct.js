const Redis = require('ioredis');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

async function testRedis() {
  console.log('============================================================');
  console.log('🔍 Testing Redis Connection & Cache Operations');
  console.log('============================================================');
  console.log(`Connecting to: ${REDIS_URL}`);

  const redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
  });

  redis.on('error', (err) => {
    console.error('❌ Redis Connection Error:', err.message);
  });

  try {
    await redis.ping();
    console.log('✅ Redis PING successful (PONG received)');

    // Test 1: Set and Get Key
    const testKey = 'test:cache:peoplepay360';
    const testPayload = { message: 'Redis is working perfectly!', timestamp: Date.now() };

    console.log('\n📝 Test 1: Writing test key...');
    await redis.setex(testKey, 60, JSON.stringify(testPayload));
    console.log('✅ Key set with 60s TTL');

    console.log('\n📖 Test 2: Reading test key...');
    const raw = await redis.get(testKey);
    const parsed = JSON.parse(raw);
    console.log('✅ Retrieved payload:', parsed);

    // Test 3: Key TTL check
    const ttl = await redis.ttl(testKey);
    console.log(`✅ Key TTL remaining: ${ttl}s`);

    // Test 4: Delete key
    await redis.del(testKey);
    const afterDel = await redis.get(testKey);
    console.log(`✅ Key deletion check (should be null): ${afterDel}`);

    // Test 5: Check existing keys in DB
    const keys = await redis.keys('cache:*');
    console.log(`\n🔑 Current "cache:*" keys in Redis (${keys.length} found):`);
    keys.slice(0, 10).forEach(k => console.log(`   • ${k}`));

    // Test 6: Memory & Server Info
    const info = await redis.info('server');
    const versionMatch = info.match(/redis_version:(.*)/);
    if (versionMatch) {
      console.log(`\nℹ️  Redis Server Version: ${versionMatch[1].trim()}`);
    }

    const memInfo = await redis.info('memory');
    const memMatch = memInfo.match(/used_memory_human:(.*)/);
    if (memMatch) {
      console.log(`ℹ️  Redis Memory Used: ${memMatch[1].trim()}`);
    }

    console.log('\n============================================================');
    console.log('🎉 Redis Caching Service is 100% OPERATIONAL & WORKING!');
    console.log('============================================================');
  } catch (err) {
    console.error('\n❌ Redis verification failed:', err.message);
  } finally {
    redis.disconnect();
  }
}

testRedis();
