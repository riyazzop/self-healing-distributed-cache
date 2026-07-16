import express, { Request, Response } from "express";
import fs from "fs";
import nodeRouter from "./routes/nodeRouter.js";
import { authenticatedMiddleware } from "./middlewares/authenticatedMiddleware.js";
import {
  runningProcesses,
  startAllNodes,
  killAllNodes,
} from "./utils/nodeUtils.js";
import userRouter from "./routes/userRouter.js";

export type User = {
  name: string;
  email: string;
  password: string;
};
export type JwtPayload = Omit<User, "password">;

export const users: User[] = [];

const PORT = parseInt(process.env.MANAGER_PORT ?? "3000", 10);
const app = express();
app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Hello from Server" });
});

app.get("/status", (_req: Request, res: Response) => {
  const active = Array.from(runningProcesses.keys());
  res.json({ activeNodes: active, count: active.length });
});

app.use("/cache", authenticatedMiddleware, nodeRouter);
app.use("/user", userRouter);
//  Signal Handlers
process.on("exit", () => {
  try {
    fs.unlinkSync("./active_nodes.json");
  } catch {
    // ignore
  }
});

process.on("SIGINT", () => {
  killAllNodes();
  process.exit(0);
});

process.on("SIGTERM", () => {
  killAllNodes();
  process.exit(0);
});

// Entrypoint
if (process.argv[1].endsWith("nodeManager.ts")) {
  startAllNodes();
  app.listen(PORT, () => {
    console.log(`Node Manager is running on port ${PORT}`);
  });
}
