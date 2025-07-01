import express from "express";
import { Boards } from "../models/Boards.ts";
import type {Board, Paginated } from "../types/api.ts";
import { checkAuth } from "../middleware/checkAuth.ts";
import { Op } from "sequelize";

export const boardsRouter = express.Router();

boardsRouter.post( "/", checkAuth, async (req, res) => {
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ status: 400, error: "Board name is required", data: null });
    return;
  }
  const board = await Boards.findOne({ where: { name } });
  if (board) {
    res.status(422).json({
      status: 422,
      error: "Board with this name already exists",
      data: null,
    });
    return;
  }
  const newBoardInstance = await Boards.create({ name });
  const newBoard = newBoardInstance.get({ plain: true });
  res.status(201).json({
    id: newBoard.boardId,
    name: newBoard.name,
    createdAt: newBoard.createdAt.toISOString(),
    updatedAt: newBoard.updatedAt.toISOString(),
  } as Board);
});

boardsRouter.get("/", checkAuth, async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 8;
  const query = (req.query.query as string) || "";

  const where = query
    ? { name: { [Op.like]: `%${query}%` } }
    : {};

  const { count: totalItems, rows } = await Boards.findAndCountAll({
    where,
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
  } as Paginated<Board>);
});

boardsRouter.get("/:id", checkAuth, async (req, res) => {
  const { id } = req.params;
  const board = await Boards.findByPk(id);
  if (!board) {
    res.status(404).json({ status: 404, error: "Board not found", data: null });
    return;
  }
  const boardData = board.get({ plain: true });
  res.json({
    id: boardData.boardId,
    name: boardData.name,
    createdAt: boardData.createdAt.toISOString(),
    updatedAt: boardData.updatedAt.toISOString(),
  } as Board);
});
