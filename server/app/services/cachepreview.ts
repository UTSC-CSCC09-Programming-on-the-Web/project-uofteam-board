import { render } from "#image-ai/render.js";
import { redisCacheClient } from "#config/redis.js";
import { RenderedImage } from "#types/image.js";
import AsyncLock from "async-lock";

const PREVIEW_CACHE_DURATION = 60 * 60 * 24; // 24 hours

const boardToKey = (boardId: string) => {
  return `bp_${boardId}`;
};

export const forceNewCachePreview = async (boardId: string): Promise<boolean> => {
  try {
    const renderedImg = await render(Number(boardId));
    await redisCacheClient.set(boardToKey(boardId), JSON.stringify(renderedImg), {
      expiration: { type: "EX", value: PREVIEW_CACHE_DURATION },
    });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const previewRenderLock = new AsyncLock();
export const getSetCachedPreview = async (boardId: string): Promise<RenderedImage | null> => {
  return await previewRenderLock.acquire(boardId, async () => {
    // Hit
    const previewImg = await redisCacheClient.get(boardToKey(boardId));
    if (previewImg) return JSON.parse(previewImg) satisfies RenderedImage;

    // Miss
    try {
      const renderedImg = await render(Number(boardId));
      await redisCacheClient.set(boardToKey(boardId), JSON.stringify(renderedImg), {
        expiration: { type: "EX", value: PREVIEW_CACHE_DURATION },
      });
      return renderedImg;
    } catch (error) {
      console.error(error);
      return null;
    }
  });
};
