import express from "express";
import { logger } from "#middleware/logger.js";
import { authRouter } from "./routes/auth.ts";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import { canvasRouter } from "./routes/canvas.ts";

dotenv.config();
const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,               
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
//app.use(logger);
app.use("/canvas", canvasRouter);
app.use("/auth", authRouter);
/*app.get("/profile", logger, (req, res) => {
  res.json({ userId: (res as any).userId });
});*/


app.get("/", (req, res) => {
  res.end();
});

const PORT = process.env.PORT;
app.listen(PORT, (err) => {
  console.log(err || `HTTP server on http://localhost:${PORT}`);
});
