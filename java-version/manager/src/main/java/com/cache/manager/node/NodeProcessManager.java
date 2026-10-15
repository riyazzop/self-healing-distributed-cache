package com.cache.manager.node;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.util.*;
import java.util.concurrent.*;

@Component
public class NodeProcessManager {

    private static final Logger log = LoggerFactory.getLogger(NodeProcessManager.class);
    private static final int RESTART_DELAY_SECONDS = 5;
    private static final String ACTIVE_NODES_FILE = "active_nodes.json";

    private final Map<String, Process> runningProcesses = new ConcurrentHashMap<>();
    private final List<NodeConfig> nodes;
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(4);
    private final ObjectMapper objectMapper = new ObjectMapper();

    public NodeProcessManager(
            @Value("${nodes.node1.id}") String node1Id,
            @Value("${nodes.node1.port}") int node1Port,
            @Value("${nodes.node2.id}") String node2Id,
            @Value("${nodes.node2.port}") int node2Port,
            @Value("${nodes.node3.id}") String node3Id,
            @Value("${nodes.node3.port}") int node3Port,
            @Value("${node.jar.path}") String jarPath
    ) {
        String resolvedJar = resolveJarPath(jarPath);
        this.nodes = List.of(
                new NodeConfig(node1Id, node1Port, resolvedJar),
                new NodeConfig(node2Id, node2Port, resolvedJar),
                new NodeConfig(node3Id, node3Port, resolvedJar)
        );
    }

    private static String resolveJarPath(String configuredPath) {
        File direct = new File(configuredPath);
        if (direct.exists()) {
            return direct.getAbsolutePath();
        }

        List<String> candidates = List.of(
                "node/target/node-1.0.0.jar",
                "../node/target/node-1.0.0.jar",
                "target/node-1.0.0.jar",
                "node-1.0.0.jar",
                "../node-1.0.0.jar"
        );

        for (String candidate : candidates) {
            File f = new File(candidate);
            if (f.exists()) {
                log.info("Resolved node JAR path to: {}", f.getAbsolutePath());
                return f.getAbsolutePath();
            }
        }

        log.warn("Node JAR not found at '{}' or fallback locations", configuredPath);
        return configuredPath;
    }

    public List<NodeConfig> getNodes() {
        return nodes;
    }

    public Set<String> getActiveNodeIds() {
        return Collections.unmodifiableSet(runningProcesses.keySet());
    }

    public void startAllNodes() {
        for (NodeConfig node : nodes) {
            startNode(node);
        }
    }

    public void startNode(NodeConfig node) {
        log.info("Starting {} on port {}", node.nodeId(), node.port());
        try {
            ProcessBuilder pb = buildProcess(node);
            pb.inheritIO();
            Process process = pb.start();
            runningProcesses.put(node.nodeId(), process);
            saveActivePids();

            process.onExit().thenAccept(p -> {
                int code = p.exitValue();
                log.warn("{} died (code:{}), restarting in {}s", node.nodeId(), code, RESTART_DELAY_SECONDS);
                runningProcesses.remove(node.nodeId());
                saveActivePids();
                scheduler.schedule(() -> startNode(node), RESTART_DELAY_SECONDS, TimeUnit.SECONDS);
            });

        } catch (IOException e) {
            log.error("Failed to start {}: {}", node.nodeId(), e.getMessage());
        }
    }

    public void killAllNodes() {
        for (Map.Entry<String, Process> entry : runningProcesses.entrySet()) {
            log.info("Stopping {}", entry.getKey());
            Process p = entry.getValue();
            p.onExit().cancel(false);
            p.destroy();
        }
        runningProcesses.clear();
        deleteActivePidsFile();
        scheduler.shutdownNow();
    }

    private void saveActivePids() {
        Map<String, Long> pids = new HashMap<>();
        runningProcesses.forEach((id, process) -> pids.put(id, process.pid()));
        try {
            objectMapper.writerWithDefaultPrettyPrinter()
                    .writeValue(new File(ACTIVE_NODES_FILE), pids);
        } catch (IOException e) {
            log.error("Failed to write active_nodes.json: {}", e.getMessage());
        }
    }

    private void deleteActivePidsFile() {
        File f = new File(ACTIVE_NODES_FILE);
        if (f.exists()) f.delete();
    }

    private ProcessBuilder buildProcess(NodeConfig node) {
        String javaExecutable = ProcessHandle.current().info().command()
                .orElse("java");

        return new ProcessBuilder(
                javaExecutable,
                "-Dserver.port=" + node.port(),
                "-Dnode.id=" + node.nodeId(),
                "-jar", node.jarPath()
        ).redirectErrorStream(false);
    }
}
