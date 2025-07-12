import { Boards } from "#models/Boards.ts";
import { User } from "#types/api.ts";
import { Request, Response, NextFunction } from "express";


export function checkAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

export async function checkCanvasAuth(boardId: string, session: User): Promise<boolean> {
    const board = await Boards.findByPk(boardId);
  if (!board || board.ownerId !== session.id) {
    return false;
  }

  return true;
}