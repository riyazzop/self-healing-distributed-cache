import fs from "fs";
import { execSync } from "child_process";
import { nodes } from "./nodeUtils.js";

const input: string | undefined = process.argv[2];

if (!input) {
  console.log("Usage: npx tsx src/killNode.ts [nodeId or port]");
  process.exit();
}

let nodeId: string = input;

const nodeByPort = nodes.find((node) => node.port == input);
if (nodeByPort) {
  nodeId = nodeByPort.nodeId;
}

if (fs.existsSync("./active_nodes.json")) {
  const pids: Record<string, number> = JSON.parse(
    fs.readFileSync("./active_nodes.json", "utf-8")
  );
  const pid: number | undefined = pids[nodeId];
  if (pid) {
    try {
      // Use taskkill /T to kill the full process tree (shell wrapper + tsx child).
      // process.kill(pid, "SIGTERM") on Windows only kills the cmd.exe shell,
      // leaving the tsx process orphaned and still holding the port.
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: "pipe" });
      console.log(
        `🔴 Manually sent SIGTERM to ${nodeId} (PID: ${pid}) and node killed`
      );
    } catch (_error) {
      console.log(`No active process found for node: ${nodeId}`);
    }
  } else {
    console.log(`No active process found for node: ${nodeId} in active_nodes.json`);
  }
} else {
  console.log("No active_nodes.json found (is the manager running?)");
}
