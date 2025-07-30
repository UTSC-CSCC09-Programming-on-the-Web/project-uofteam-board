import redis from "redis";

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

const createRedisClient = (dbNum: number): ReturnType<typeof redis.createClient> => {
  const redisClient = redis.createClient({
    socket: {
      host: REDIS_HOST,
      port: REDIS_PORT,
    },
    password: REDIS_PASSWORD,
    database: dbNum,
  });

  redisClient.on("connect", () => {
    console.log(`Redis client ${dbNum} connected to:`, `${REDIS_HOST}:${REDIS_PORT}`);
  });

  redisClient.on("ready", () => {
    console.log(`Redis client ${dbNum} is ready!`);
  });

  redisClient.on("error", (err: unknown) => {
    console.error(`Redis Client ${dbNum} Error:`, err);
  });

  redisClient.on("end", () => {
    console.log(`Redis client ${dbNum} disconnected.`);
  });

  return redisClient;
};

export const redisSessionClient = createRedisClient(1);
export const redisCacheClient = createRedisClient(0);
