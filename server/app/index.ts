import express from "express";
import { logger } from "#middleware/logger.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(logger);

app.get("/", (req, res) => {
  res.end();
});

const PORT = process.env.PORT;
app.listen(PORT, (err) => {
  console.log(err || `HTTP server on http://localhost:${PORT}`);
});
