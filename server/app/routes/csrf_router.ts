import { Router } from "express";
import { generateToken } from "#services/csrftoken.js"


export const csrfTokenRouter = Router();

csrfTokenRouter.get("/", async (req, res) => {
  res.json({
    token: generateToken(req, true)
  })
});
