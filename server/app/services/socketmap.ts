import { redisCacheClient } from "#config/redis.js";
import AsyncLock from "async-lock";

const userToKey = (userId: number) => {
  return `ws_${userId}`;
};
const mapLock = new AsyncLock();

export const clearUserSocketId = async (userId: number) => {
  await mapLock.acquire(userId.toString(), async () => {
    redisCacheClient.del(userToKey(userId));
  });
};

export const setUserSocketId = async (userId: number, socketId: string) => {
  await mapLock.acquire(userId.toString(), async () => {
    await redisCacheClient.set(userToKey(userId), socketId);
  });
};

export const getUserSocketId = async (userId: number): Promise<string | null> => {
  const socketId = await redisCacheClient.get(userToKey(userId));
  if (socketId) return socketId;
  return null;
};
