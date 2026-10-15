package com.cache.manager.hash;

import com.cache.manager.node.NodeConfig;
import com.cache.manager.node.NodeProcessManager;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ConsistentHashingService {

    private final NodeProcessManager processManager;

    public ConsistentHashingService(NodeProcessManager processManager) {
        this.processManager = processManager;
    }

    public int getNodeIndexFromUsername(String name) {
        long res = 0;
        for (int i = 0; i < name.length(); i++) {
            res += (long) (name.charAt(i) * Math.pow(11, i + 1));
        }
        return (int) (Math.abs(res) % 3) + 1;
    }

    public NodeConfig getPrimaryNode(String username) {
        int index = getNodeIndexFromUsername(username);
        List<NodeConfig> nodes = processManager.getNodes();
        return nodes.get(index - 1);
    }

    public NodeConfig getReplicaNode(NodeConfig primary) {
        List<NodeConfig> nodes = processManager.getNodes();
        int primaryIndex = nodes.indexOf(primary);
        int replicaIndex = (primaryIndex + 1) % nodes.size();
        return nodes.get(replicaIndex);
    }
}
