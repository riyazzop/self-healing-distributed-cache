package com.cache.node;

import java.time.Instant;

public record CacheEntry(Object value, String type, Instant insertedAt) {

    public CacheEntry(Object value, String type) {
        this(value, type, Instant.now());
    }
}
