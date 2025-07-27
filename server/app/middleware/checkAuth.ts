import { BoardShares } from "#models/BoardShares.js";
import { StripeCustomers } from "#models/StripeCustomers.js";
import { BoardPermission, User } from "#types/api.js";
import { Request, Response, NextFunction } from "express";

async function checkPaid(userId: number): Promise<boolean> {
  const stripeCustomer = await StripeCustomers.findByPk(userId);
  return stripeCustomer?.status === 'active';
}

export function checkAuth(requirePayment = true): (req: Request, res: Response, next: NextFunction) => void {

  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    
    req.session.user.paid = await checkPaid(req.session.user.id);
    if (requirePayment && !req.session.user.paid) {
      res.status(403).json({ error: "User has not paid subscription fee" });
      return;
    }
    next();
  }
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
