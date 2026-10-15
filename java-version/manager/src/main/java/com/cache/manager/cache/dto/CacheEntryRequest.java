package com.cache.manager.cache.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CacheEntryRequest(
        @NotBlank(message = "key is required")
        String key,

        @NotNull(message = "value is required")
        Object value
) {}

