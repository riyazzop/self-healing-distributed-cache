import { spawn, ChildProcess, execSync } from "child_process";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

export interface NodeConfig {
  nodeId: string;
  port: string;
  script: string;
}

export const nodes: NodeConfig[] = [
  {
    nodeId: process.env.NODE_1 as string,
    port: process.env.PORT1 as string,
    script: "./src/node.ts",
  },
  {
    nodeId: process.env.NODE_2 as string,
    port: process.env.PORT2 as string,
    script: "./src/node.ts",
  },
  {
    nodeId: process.env.NODE_3 as string,
    port: process.env.PORT3 as string,
    script: "./src/node.ts",
  },
];

export const runningProcesses = new Map<string, ChildProcess>();

// Saves active PIDs to a file so external tools (e.g. killNode.ts) can read them.
export function saveActivePids(): void {
  const pids: Record<string, number> = {};
  for (const [nodeId, child] of runningProcesses.entries()) {
    if (child.pid) {
      pids[nodeId] = child.pid;
    }
  }
  fs.writeFileSync("./active_nodes.json", JSON.stringify(pids, null, 2));
}

// Frees a port before spawning — kills any stale process holding it.
export function killPort(port: string): void {
  try {
    execSync(
      `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port}') do taskkill /PID %a /F`,
      { stdio: "pipe", encoding: "utf8" },
    );
  } catch {
    // port was already free — ignore
  }
}

export function startNode(node: NodeConfig): void {
  // Free the port before spawning so a stale process can't block the restart.
  killPort(node.port);

  console.log(`Starting ${node.nodeId} on port ${node.port}`);
  const tsxBin = path.resolve("node_modules", ".bin", "tsx");

  const child = spawn(
    tsxBin,
    [node.script, node.port, node.nodeId],
    {
      env: {
        ...process.env,
        NODE_ID: node.nodeId,
        PORT: node.port,
      },
      // Fully isolate the child from the parent's console.
      // "inherit" would share the Windows console session — killing one child
      // sends CTRL_CLOSE_EVENT to ALL processes (including the manager).
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
      windowsHide: true,
    },
  );

  // Forward child output to the manager's terminal so logs are still visible.
  child.stdout?.pipe(process.stdout, { end: false });
  child.stderr?.pipe(process.stderr, { end: false });

  runningProcesses.set(node.nodeId, child);
  saveActivePids();

  child.on("exit", (code: number | null) => {
    console.log(`${node.nodeId} died (code:${code}), restarting in 5s...`);
    runningProcesses.delete(node.nodeId);
    saveActivePids();
    setTimeout(() => {
      // Kill any stale process still holding the port, wait 500ms for the OS
      // to fully release it, then spawn the replacement.
      killPort(node.port);
      setTimeout(() => startNode(node), 500);
    }, 5 * 1000);
  });

  child.on("error", (error: Error) => {
    console.error(`${node.nodeId} process error:`, error);
  });
}

export function killAllNodes(): void {
  for (const [nodeId, child] of runningProcesses.entries()) {
    console.log(`Stopping ${nodeId}...`);
    child.removeAllListeners("exit"); // prevent restart loop on intentional kill
    child.kill("SIGTERM");
  }
  runningProcesses.clear();
}

export function startAllNodes(): void {
  for (const node of nodes) {
    startNode(node);
  }
}
