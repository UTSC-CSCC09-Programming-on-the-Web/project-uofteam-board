import { Request, Response, NextFunction } from "express";

export const logger = (req: Request, _: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.url}`);
  if (req.body) console.log(req.body);
  console.log("");
  next();
};
