import express from "express";
import { sequelize } from "./config/datasource.js";
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
import { redisCacheClient, redisSessionClient } from "#config/redis.js";
import { saveSessionStore } from "#services/sessionstore.js";

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

// Connect to PostgreSQL
try {
  await sequelize.authenticate();
  await sequelize.sync({ alter: { drop: false } });
  console.log("PostgreSQL has been established successfully.");
} catch (error) {
  console.error("Unable to connect to the database:", error);
}

// Connect to Redis
try {
  await redisCacheClient.connect();
  await redisSessionClient.connect();
} catch (error) {
  console.error("Unable to connect to redis:", error);
}

// Create session store
const sessionStore = saveSessionStore(redisSessionClient);

// Cookie
const sessionMiddleware = session({
  store: sessionStore,
  secret: process.env.SECRET_KEY || "default_secret_key",
  resave: false,
  saveUninitialized: false, // Don't create session until something stored
  cookie: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // CSRF protection
  },
});
app.use(sessionMiddleware);

// Create websocket endpoint
const server = http.createServer(app);
const io = new Server(server, {
  cors: corsConfig,
  path: "/ws/",
});
io.engine.use(sessionMiddleware);
registerWebSocket(io);

// Attach routers for endpoints
boardsRouter.use("/:id/shares", sharesSubRouter);
app.use("/api/auth", usersRouter);
app.use("/api/boards", boardsRouter);
app.use("/api/stripe", stripeRouter);

// Universal error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack || err);
  res.status(500).json({ error: "Internal Server Error" });
  next(err);
});

// Begin listening
const PORT = process.env.PORT || 3000;
server.listen(PORT, (err?: Error) => {
  if (err) {
    console.error(err);
  } else {
    console.log(`HTTP & WebSocket server running on http://localhost:${PORT}`);
  }
});
