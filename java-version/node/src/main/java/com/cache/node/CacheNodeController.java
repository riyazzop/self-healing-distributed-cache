package com.cache.node;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@RestController
public class CacheNodeController {

    private static final Logger log = LoggerFactory.getLogger(CacheNodeController.class);

    private final ConcurrentHashMap<String, CacheEntry> cache = new ConcurrentHashMap<>();

    @Value("${node.id:NODE-UNKNOWN}")
    private String nodeId;

    @Value("${server.port:8080}")
    private String port;

    @Value("${node.ttl-seconds:0}")
    private long ttlSeconds;

    @PostMapping("/put")
    public ResponseEntity<?> put(@RequestBody PutRequest request) {
        if (request.key() == null || request.key().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Request body must have at least one key"));
        }
        cache.put(request.key(), new CacheEntry(request.value(), request.type()));
        return ResponseEntity.ok(Map.of(
                "message", "Key-Value pair inserted successfully",
                "key", request.key(),
                "value", request.value()
        ));
    }

    @GetMapping("/get/{key}")
    public ResponseEntity<?> get(@PathVariable String key) {
        CacheEntry entry = cache.get(key);
        if (entry == null) {
            return ResponseEntity.ok(Map.of(
                    "data", "null",
                    "message", "Key \"" + key + "\" not found in cache",
                    "success", false
            ));
        }
        return ResponseEntity.ok(Map.of(
                "data", Map.of("key", key, "value", entry.value()),
                "message", "Successfully returning ...",
                "success", true
        ));
    }

    @GetMapping("/get-all")
    public ResponseEntity<?> getAll(@RequestParam(required = false) String type) {
        Map<String, Object> filtered = cache.entrySet().stream()
                .filter(e -> type == null || type.equals(e.getValue().type()))
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        e -> Map.of("value", e.getValue().value(), "type", e.getValue().type())
                ));
        return ResponseEntity.ok(filtered);
    }

    @PostMapping("/put-all")
    public ResponseEntity<?> putAll(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) body.get("data");
        if (data != null) {
            data.forEach((key, val) -> cache.put(key, new CacheEntry(val, "replica")));
        }
        return ResponseEntity.ok(Map.of("message", "Copied successfully"));
    }

    @DeleteMapping("/delete/{key}")
    public ResponseEntity<?> delete(@PathVariable String key) {
        boolean deleted = cache.remove(key) != null;
        if (!deleted) {
            return ResponseEntity.ok(Map.of(
                    "message", "Key: " + key + " doesn't exist in cache",
                    "success", false
            ));
        }
        return ResponseEntity.ok(Map.of(
                "message", "Key: {" + key + "} and its value deleted successfully from cache",
                "success", true
        ));
    }

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        Runtime runtime = Runtime.getRuntime();
        return ResponseEntity.ok(Map.of(
                "status", "ok",
                "keyCount", cache.size(),
                "upTimeMs", ProcessHandle.current().info().totalCpuDuration()
                        .map(d -> d.toMillis()).orElse(0L),
                "nodeId", nodeId,
                "memoryUsedBytes", runtime.totalMemory() - runtime.freeMemory(),
                "timestamp", Instant.now().toEpochMilli()
        ));
    }

    @GetMapping("/info")
    public ResponseEntity<?> info() {
        return ResponseEntity.ok(Map.of(
                "nodeId", nodeId,
                "port", port,
                "keyCount", cache.size(),
                "status", "alive"
        ));
    }

    @Scheduled(fixedDelay = 30_000)
    public void evictExpiredEntries() {
        if (ttlSeconds <= 0) return;
        Instant cutoff = Instant.now().minusSeconds(ttlSeconds);
        int before = cache.size();
        cache.entrySet().removeIf(e -> e.getValue().insertedAt().isBefore(cutoff));
        int evicted = before - cache.size();
        if (evicted > 0) {
            log.info("[{}] TTL eviction: removed {} expired entries", nodeId, evicted);
        }
    }

    public record PutRequest(String key, Object value, String type) {}
}
