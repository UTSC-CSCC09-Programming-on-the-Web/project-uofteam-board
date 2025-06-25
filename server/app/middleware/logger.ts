import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const logger = (req: Request, res: Response, next: NextFunction) => {
  const sessionToken = req.cookies.token;
    if (!sessionToken) return res.status(401).json({ message: "No token" });
  
    try {
      const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET!);
      (req as any).userId = (decoded as any).userId;
      next();
    } catch (err) {
      return res.status(403).json({ message: "Invalid session Token" });
    }
};
