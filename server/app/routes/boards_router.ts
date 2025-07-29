import express from "express";
import { Op } from "sequelize";
import { Boards } from "#models/Boards.js";
import type { Board, BoardPermission, Paginated, Path } from "#types/api.js";
import { checkAuth } from "#middleware/checkAuth.js";
import { render } from "#image-ai/render.js";
import { main as aiModel } from "#image-ai/model.js";
import { vectorizeBase64 } from "#image-ai/vectorize.js";
import { BoardShares } from "#models/BoardShares.js";
import { redisClient } from "#config/redis.js";
import { RenderedImage } from "#types/image.js";
import AsyncLock from "async-lock";

const PREVIEW_CACHE_DURATION = 60 * 60 * 24 // 24 hours

export const boardsRouter = express.Router();


boardsRouter.post("/", checkAuth, async (req, res) => {
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ error: "Board name is required" });
    return;
  }

  const newBoard = await Boards.create({ name });
  const newBoardShare = await BoardShares.create({
    boardId: newBoard.boardId,
    userId: req.session.user?.id,
    permission: "owner",
  });

  res.status(201).json({
    id: newBoard.boardId,
    name: newBoard.name,
    createdAt: newBoard.createdAt.toISOString(),
    updatedAt: newBoard.updatedAt.toISOString(),
    permission: newBoardShare.permission,
  } satisfies Board);
});

boardsRouter.get("/", checkAuth, async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 8;
  const query = (req.query.query as string) || "";

  const { count: totalItems, rows } = await BoardShares.findAndCountAll({
    where: {
      userId: req.session.user?.id,
    },
    include: {
      model: Boards,
      ...(query && {
        where: {
          name: {
            [Op.iLike]: `%${query}%`, // Case insensitive search
          },
        },
      }),
    },
    offset: (page - 1) * limit,
    limit,
    order: [[Boards, "createdAt", "DESC"]],
  });

  const totalPages = Math.ceil(totalItems / limit) || 1;
  const currPage = Math.max(1, Math.min(page, totalPages));

  res.json({
    totalItems,
    totalPages,
    currPage,
    prevPage: currPage > 1 ? currPage - 1 : null,
    nextPage: currPage < totalPages ? currPage + 1 : null,
    limit,
    data: rows
      .map((b) => b.get({ plain: true }))
      .map((b) => ({
        id: b.boardId,
        name: b.Board.name,
        createdAt: b.Board.createdAt.toISOString(),
        updatedAt: b.Board.updatedAt.toISOString(),
        permission: b.permission,
      })),
  } satisfies Paginated<Board>);
});

boardsRouter.get("/:id", checkAuth, async (req, res) => {
  const { id } = req.params;
  const board = await BoardShares.findOne({
    where: {
      boardId: id,
      userId: req.session.user?.id,
    },
    include: {
      model: Boards,
    },
  });
  if (!board) {
    res.status(404).json({ error: "Board not found" });
    return;
  }

  const boardData = board.get({ plain: true });
  res.json({
    id: boardData.boardId,
    name: boardData.Board.name,
    createdAt: boardData.Board.createdAt.toISOString(),
    updatedAt: boardData.Board.updatedAt.toISOString(),
    permission: boardData.permission,
  } satisfies Board);
});

const previewRenderLock = new AsyncLock();
const getCachedPreview = async (boardId: string): Promise<RenderedImage | null> => {
  return await previewRenderLock.acquire(boardId, async () => {
    // Hit
    const previewImg = await redisClient.get(boardId);
    if (previewImg) return JSON.parse(previewImg) satisfies RenderedImage;

    // Miss
    try {
      const renderedImg = await render(Number(boardId));
      await redisClient.set(boardId, JSON.stringify(renderedImg), {
        expiration: { type: 'EX', value: PREVIEW_CACHE_DURATION }
      });
      return renderedImg;
    } catch (error) {
      console.error(error);
      return null;
    }
  })
}

boardsRouter.get("/:id/picture", checkAuth, async (req, res) => {
  const { id } = req.params;
  const board = await BoardShares.findOne({
    where: {
      boardId: id,
      userId: req.session.user?.id,
    },
  });
  if (!board) {
    res.status(404).json({ error: "Board not found" });
    return;
  }

  const previewImg = await getCachedPreview(id);
  if (previewImg === null) throw new Error("Failed to generate cached preview image!");

  const imgBuffer = Buffer.from(previewImg.base64, 'base64');
  res.set('Content-Type', previewImg.mimeType);
  res.send(imgBuffer);
});

boardsRouter.patch("/:id", checkAuth, async (req, res) => {
  const ALLOWED: BoardPermission[] = ["owner", "editor"];
  const { name } = req.body;
  const { id } = req.params;
  if (!name) {
    res.status(400).json({ error: "Board name is required" });
    return;
  }

  const boardShare = await BoardShares.findOne({
    where: {
      boardId: id,
      userId: req.session.user?.id,
    },
  });
  if (!boardShare) {
    res.status(404).json({ error: "Board not found" });
    return;
  }
  if (!ALLOWED.includes(boardShare.permission)) {
    res.status(403).json({ error: "Do not have authority to make this change" });
    return;
  }

  const board = await Boards.findByPk(boardShare.boardId);
  if (!board) throw Error("Board share referencing non-existant board!");
  board.name = name;
  await board.save();

  res.json({
    id: boardShare.boardId,
    name: board.name,
    createdAt: board.createdAt.toISOString(),
    updatedAt: board.updatedAt.toISOString(),
    permission: boardShare.permission,
  } satisfies Board);
});

boardsRouter.delete("/:id", checkAuth, async (req, res) => {
  const ALLOWED: BoardPermission[] = ["owner"];
  const { id } = req.params;

  const boardShare = await BoardShares.findOne({
    where: {
      boardId: id,
      userId: req.session.user?.id,
    },
  });
  if (!boardShare) {
    res.status(404).json({ error: "Board not found" });
    return;
  }
  if (!ALLOWED.includes(boardShare.permission)) {
    res.status(403).json({ error: "Do not have authority to make this change" });
    return;
  }

  const board = await Boards.findByPk(boardShare.boardId);
  if (!board) throw Error("Board share referencing non-existant board!");
  await board.destroy();

  res.json({
    id: boardShare.boardId,
    name: board.name,
    createdAt: board.createdAt.toISOString(),
    updatedAt: board.updatedAt.toISOString(),
    permission: boardShare.permission,
  } satisfies Board);
});

boardsRouter.post("/:id/generative-fill", checkAuth, async (req, res) => {
  const { pathIDs } = req.body;
  const { id } = req.params;
  if (!id || !(await Boards.findByPk(id))) {
    res.status(404).json({ error: "Board not found" });
    return;
  }
  if (!Array.isArray(pathIDs) || pathIDs.length === 0) {
    res.status(400).json({ error: "Invalid path IDs" });
    return;
  }

  try {
    const renderedImg = await render(Number(id), pathIDs);
    const newImgBase64 = await aiModel(renderedImg.base64);
    const paths = await vectorizeBase64(newImgBase64);
    res.json(paths satisfies Path[]);
  } catch (err) {
    res.status(500).json({ error: "Failed to create new image" });
    console.error("Error generating new image:", err);
    return;
  }
});
