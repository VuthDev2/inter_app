// redisClient.js – simple Redis connection for QuickVoice backend
// Uses the official `redis` npm package (v4). Adjust the URL via ENV vars.

import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = createClient({
  url: redisUrl,
});

redisClient.on('error', (err) => {
  console.error('[Redis] Connection error:', err);
});

await redisClient.connect();

export default redisClient;
