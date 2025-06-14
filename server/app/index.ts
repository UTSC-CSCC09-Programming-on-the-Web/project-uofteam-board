import express from "express";
import { logger } from "#middleware/logger.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(logger);

app.get("/", (req, res) => {
  res.end();
});

app.get("/test", (req, res) => {
  const unusedVar = 42; // Should trigger an ESLint warning
  const age: number = "30"; // Should trigger a TypeScript error
  console.log(age);
  res.end() // Should trigger a prettier error
});

const PORT = process.env.PORT;
app.listen(PORT, (err) => {
  console.log(err || `HTTP server on http://localhost:${PORT}`);
});
