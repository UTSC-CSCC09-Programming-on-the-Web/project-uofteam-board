import { Request, Response, NextFunction } from "express";

export function checkAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}
