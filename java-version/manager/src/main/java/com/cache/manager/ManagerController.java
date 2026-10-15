package com.cache.manager;

import com.cache.manager.node.NodeProcessManager;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Set;

@RestController
public class ManagerController {

    private final NodeProcessManager processManager;

    public ManagerController(NodeProcessManager processManager) {
        this.processManager = processManager;
    }

    @GetMapping("/")
    public ResponseEntity<?> root() {
        return ResponseEntity.ok(Map.of("message", "Hello from Cache Manager"));
    }

    @GetMapping("/status")
    public ResponseEntity<?> status() {
        Set<String> active = processManager.getActiveNodeIds();
        return ResponseEntity.ok(Map.of(
                "activeNodes", active,
                "count", active.size()
        ));
    }
}
