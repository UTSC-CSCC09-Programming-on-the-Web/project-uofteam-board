import { BoardShares } from "#models/BoardShares.ts";
import { BoardPermission, User } from "#types/api.ts";
import { Request, Response, NextFunction } from "express";

export function checkAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

export async function checkCanvasAuth(
  boardId: string,
  session: User,
): Promise<BoardPermission | null> {
  const board = await BoardShares.findOne({
    where: {
      boardId,
      userId: session.id,
    },
  });
  if (board) {
    return board.permission;
  }
  return null;
}
