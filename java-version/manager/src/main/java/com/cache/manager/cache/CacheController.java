package com.cache.manager.cache;

import com.cache.manager.cache.dto.CacheEntryRequest;
import com.cache.manager.security.MyUserDetails;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClientException;

import java.util.Map;

@RestController
@RequestMapping("/cache")
public class CacheController {

    private final CacheService cacheService;

    public CacheController(CacheService cacheService) {
        this.cacheService = cacheService;
    }

    @PostMapping("/put")
    public ResponseEntity<?> put(
            @AuthenticationPrincipal MyUserDetails user,
            @Valid @RequestBody CacheEntryRequest request
    ) throws InterruptedException {
        try {
            Map<?, ?> result = cacheService.set(user.name(), request.key(), request.value());
            return ResponseEntity.ok(result);
        } catch (RestClientException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Primary node write failed after retry"));
        }
    }

    @GetMapping("/get/{key}")
    public ResponseEntity<?> get(
            @AuthenticationPrincipal MyUserDetails user,
            @PathVariable String key
    ) throws InterruptedException {
        try {
            Map<?, ?> data = cacheService.get(user.name(), key);
            boolean success = Boolean.TRUE.equals(data.get("success"));
            return success
                    ? ResponseEntity.ok(data)
                    : ResponseEntity.status(404).body(data);
        } catch (RestClientException e) {
            return ResponseEntity.status(503)
                    .body(Map.of("message", "Both primary and replica nodes are unavailable"));
        }
    }

    @DeleteMapping("/delete/{key}")
    public ResponseEntity<?> delete(
            @AuthenticationPrincipal MyUserDetails user,
            @PathVariable String key
    ) throws InterruptedException {
        CacheService.DeleteResult result = cacheService.delete(user.name(), key);

        if (!result.primaryDeleted() && !result.replicaDeleted()) {
            return ResponseEntity.status(404)
                    .body(Map.of("message", "Key \"" + key + "\" not found in cache"));
        }
        if (!result.primaryDeleted()) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Deleted from replica but primary delete failed"));
        }
        return ResponseEntity.ok(Map.of("message", "Deletion successful"));
    }
}
