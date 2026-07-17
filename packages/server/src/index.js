import "dotenv/config";
import express from "express";
import { authRouter } from "./routes/auth.js";
import { campRouter } from "./routes/camp.js";
import { fighterRouter } from "./routes/fighters.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/camp", campRouter);
app.use("/api/fighters", fighterRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`@ironfist/server listening on :${PORT}`);
});
