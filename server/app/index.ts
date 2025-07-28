import express from "express";
import { sequelize } from "./datasource.js";
import session from "express-session";
import { logger } from "#middleware/logger.js";
import { usersRouter } from "#routes/users_router.js";
import { boardsRouter } from "#routes/boards_router.js";
import { sharesSubRouter } from "#routes/shares_router.js";
import { stripeRouter, stripeWebhook } from "#routes/stripe_router.js";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { registerWebSocket } from "#ws/canvas.js";

if (!process.env.SECRET_KEY) {
  console.warn("SECRET_KEY is not set. Using default secret key for session management.");
}

const corsConfig = {
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
};

const app = express();

app.use("/api/stripe/", stripeWebhook); // Must be before the json parser
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(logger);

// Cross-Origin Resource Sharing
app.use(cors(corsConfig));

const sessionMiddleware = session({
  secret: process.env.SECRET_KEY || "default_secret_key",
  resave: false,
  saveUninitialized: true,
});
app.use(sessionMiddleware);

// Create websocket endpoint
const server = http.createServer(app);
const io = new Server(server, {
  cors: corsConfig,
  path: "/ws/",
});
// io.use((socket, next) => {
//   console.log(`New socket connection: ${socket.id}`);
//   next();
// });
io.engine.use(sessionMiddleware);
registerWebSocket(io);

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

boardsRouter.use("/:id/shares", sharesSubRouter);
app.use("/api/auth", usersRouter);
app.use("/api/boards", boardsRouter);
app.use("/api/stripe", stripeRouter);

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack || err);
  res.status(500).json({ error: "Internal Server Error" });
  next(err);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, (err?: Error) => {
  if (err) {
    console.error(err);
  } else {
    console.log(`HTTP & WebSocket server running on http://localhost:${PORT}`);
  }
});
