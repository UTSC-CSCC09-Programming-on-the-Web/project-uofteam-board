import { RedisStore } from "connect-redis";
import { createClient } from "redis";

let sessionStore: RedisStore | null = null;

export const saveSessionStore = (redisClient: ReturnType<typeof createClient>): RedisStore => {
  sessionStore = new RedisStore({ client: redisClient });
  return sessionStore;
};

export const getSessionStore = (): RedisStore => {
  if (sessionStore === null) throw Error("Cannot get session store before setting it!");
  return sessionStore;
};
