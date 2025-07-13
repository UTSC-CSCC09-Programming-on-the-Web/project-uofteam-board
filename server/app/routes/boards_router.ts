import express from "express";
import { Op } from "sequelize";
import { Boards } from "#models/Boards.ts";
import type { Board, Paginated, Path } from "#types/api.ts";
import { checkAuth } from "#middleware/checkAuth.ts";
import { render } from "#image-ai/render.ts";
import { main as aiModel } from "#image-ai/model.ts";
import { vectorizeBase64 } from "#image-ai/vectorize.ts";

export const boardsRouter = express.Router();

boardsRouter.post("/", checkAuth, async (req, res) => {
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ error: "Board name is required" });
    return;
  }
  const board = await Boards.findOne({ where: { name } });
  if (board) {
    res.status(422).json({ error: "Board with this name already exists" });
    return;
  }
  const newBoardInstance = await Boards.create({ ownerId: req.session.user?.id, name });
  const newBoard = newBoardInstance.get({ plain: true });
  res.status(201).json({
    id: newBoard.boardId,
    name: newBoard.name,
    createdAt: newBoard.createdAt.toISOString(),
    updatedAt: newBoard.updatedAt.toISOString(),
  } satisfies Board);
});

boardsRouter.get("/", checkAuth, async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 8;
  const query = (req.query.query as string) || "";

  const { count: totalItems, rows } = await Boards.findAndCountAll({
    where: {
      ownerId: req.session.user?.id,
      ...(query && {
        name: {
          [Op.iLike]: `%${query}%`, // Case insensitive search
        },
      }),
    },
    offset: (page - 1) * limit,
    limit,
    order: [["createdAt", "DESC"]],
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
        name: b.name,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
      })),
  } satisfies Paginated<Board>);
});

boardsRouter.get("/:id", checkAuth, async (req, res) => {
  const { id } = req.params;
  const board = await Boards.findByPk(id);
  if (!board) {
    res.status(404).json({ error: "Board not found" });
    return;
  }
  const boardData = board.get({ plain: true });
  res.json({
    id: boardData.boardId,
    name: boardData.name,
    createdAt: boardData.createdAt.toISOString(),
    updatedAt: boardData.updatedAt.toISOString(),
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
    const imgBase64 = await render(Number(id), pathIDs);
    const newImgBase64 = await aiModel(imgBase64);
    const paths = await vectorizeBase64(newImgBase64)
    res.json(paths satisfies Path[]);
  } catch (err) {
    res.status(500).json({ error: "Failed to create new image" });
    console.error("Error generating new image:", err);
    return;
  }
})
