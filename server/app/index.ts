import express from "express";
import { sequelize } from "./datasource.ts";
import session from "express-session";
import { logger } from "#middleware/logger.js";
import { usersRouter } from "#routes/users_router.ts";
import { boardsRouter } from "#routes/boards_router.ts";
import cors from "cors";

if (!process.env.SECRET_KEY) {
  console.warn("SECRET_KEY is not set. Using default secret key for session management.");
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(logger);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);

app.use(
  session({
    secret: process.env.SECRET_KEY || "default_secret_key",
    resave: false,
    saveUninitialized: true,
  }),
);

try {
  await sequelize.authenticate();
  await sequelize.sync({ alter: { drop: false } });
  console.log("Connection has been established successfully.");
} catch (error) {
  console.error("Unable to connect to the database:", error);
}

app.get("/", (req, res) => {
  res.end();
});

app.use("/api/auth", usersRouter);
app.use("/api/boards", boardsRouter);

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack || err);
  res.status(500).json({ error: "Internal Server Error" });
  next(err);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, (err) => {
  console.log(err || `HTTP server on http://localhost:${PORT}`);
});
