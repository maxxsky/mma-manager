import "dotenv/config";
import express from "express";
import { authRouter } from "./routes/auth.js";
import { campRouter } from "./routes/camp.js";
import { fighterRouter } from "./routes/fighters.js";
import { fightRouter } from "./routes/fights.js";

const app = express();

app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/camp", campRouter);
app.use("/api/fighters", fighterRouter);
app.use("/api/fights", fightRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

export { app };
