import redis from "redis"

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

export const redisClient = redis.createClient({
  socket: {
    host: REDIS_HOST,
    port: REDIS_PORT
  },
  password: REDIS_PASSWORD
});

redisClient.on('connect', () => {
  console.log('Redis client connected to:', `${REDIS_HOST}:${REDIS_PORT}`);
});

redisClient.on('ready', () => {
  console.log('Redis client is ready!');
});

redisClient.on('error', (err: unknown) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('end', () => {
  console.log('Redis client disconnected.');
});