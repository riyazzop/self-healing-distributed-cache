package com.cache.manager.node;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
public class NodeClient {

    private final RestClient restClient;

    public NodeClient(RestClient.Builder builder) {
        this.restClient = builder.build();
    }

    private String baseUrl(int port) {
        return "http://localhost:" + port;
    }

    public Map<?, ?> put(int port, String key, Object value, String type) {
        return restClient.post()
                .uri(baseUrl(port) + "/put")
                .body(Map.of("key", key, "value", value, "type", type))
                .retrieve()
                .body(Map.class);
    }

    public Map<?, ?> get(int port, String key) {
        return restClient.get()
                .uri(baseUrl(port) + "/get/" + key)
                .retrieve()
                .body(Map.class);
    }

    public Map<?, ?> delete(int port, String key) {
        return restClient.delete()
                .uri(baseUrl(port) + "/delete/" + key)
                .retrieve()
                .body(Map.class);
    }
}
