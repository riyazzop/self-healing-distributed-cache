package com.cache.manager.cache;

import com.cache.manager.hash.ConsistentHashingService;
import com.cache.manager.node.NodeClient;
import com.cache.manager.node.NodeConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;

import java.util.Map;

@Service
public class CacheService {

    private static final Logger log = LoggerFactory.getLogger(CacheService.class);
    private static final int RETRY_DELAY_SECONDS = 8;

    private final NodeClient nodeClient;
    private final ConsistentHashingService hashingService;

    public CacheService(NodeClient nodeClient, ConsistentHashingService hashingService) {
        this.nodeClient = nodeClient;
        this.hashingService = hashingService;
    }

    public Map<?, ?> set(String username, String key, Object value) throws InterruptedException {
        NodeConfig primary = hashingService.getPrimaryNode(username);
        NodeConfig replica = hashingService.getReplicaNode(primary);

        Map<?, ?> result = writeWithRetry(primary, key, value, "primary", true);

        try {
            writeWithRetry(replica, key, value, "replica", false);
        } catch (Exception e) {
            log.warn("Replica write failed permanently for key={}, continuing", key);
        }

        return result;
    }

    public Map<?, ?> get(String username, String key) throws InterruptedException {
        NodeConfig primary = hashingService.getPrimaryNode(username);
        NodeConfig replica = hashingService.getReplicaNode(primary);

        try {
            return nodeClient.get(primary.port(), key);
        } catch (RestClientException e) {
            log.warn("Primary get failed, falling back to replica");
        }

        return nodeClient.get(replica.port(), key);
    }

    public DeleteResult delete(String username, String key) throws InterruptedException {
        NodeConfig primary = hashingService.getPrimaryNode(username);
        NodeConfig replica = hashingService.getReplicaNode(primary);

        boolean primaryDeleted = deleteWithRetry(primary, key);
        boolean replicaDeleted = deleteWithRetry(replica, key);

        return new DeleteResult(primaryDeleted, replicaDeleted);
    }

    private Map<?, ?> writeWithRetry(NodeConfig node, String key, Object value,
                                     String type, boolean throwOnFailure)
            throws InterruptedException {
        try {
            return nodeClient.put(node.port(), key, value, type);
        } catch (RestClientException e) {
            log.warn("{} write failed, waiting {}s for node to recover", type, RETRY_DELAY_SECONDS);
            Thread.sleep(RETRY_DELAY_SECONDS * 1000L);
            try {
                Map<?, ?> result = nodeClient.put(node.port(), key, value, type);
                log.info("{} write successful after retry", type);
                return result;
            } catch (RestClientException retryEx) {
                if (throwOnFailure) {
                    throw retryEx;
                }
                return null;
            }
        }
    }

    private boolean deleteWithRetry(NodeConfig node, String key) throws InterruptedException {
        try {
            Map<?, ?> result = nodeClient.delete(node.port(), key);
            return Boolean.TRUE.equals(result.get("success"));
        } catch (RestClientException e) {
            log.warn("Delete failed on {}, retrying after {}s", node.nodeId(), RETRY_DELAY_SECONDS);
            Thread.sleep(RETRY_DELAY_SECONDS * 1000L);
            try {
                Map<?, ?> result = nodeClient.delete(node.port(), key);
                return Boolean.TRUE.equals(result.get("success"));
            } catch (RestClientException retryEx) {
                log.error("Delete on {} failed after retry", node.nodeId());
                return false;
            }
        }
    }

    public record DeleteResult(boolean primaryDeleted, boolean replicaDeleted) {}
}
