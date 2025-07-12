import express from "express";
import { Op } from "sequelize";
import { Boards } from "#models/Boards.ts";
import type { Board, Paginated, Path } from "#types/api.ts";
import { checkAuth } from "#middleware/checkAuth.ts";
import { render } from "#image-ai/render.ts";
import { main as aiModel } from "#image-ai/model.ts";

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

  const base64Image = await render(Number(id), pathIDs);
  aiModel(base64Image);
  res.json([
    {
      id: crypto.randomUUID(),
      d: "M 10 10 L 100 100", // Simple SVG line from (10,10) to (100,100)
      strokeColor: "#0F00F0",
      strokeWidth: 2,
      fillColor: "none",
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    } satisfies Path
  ] satisfies Path[]);
})
