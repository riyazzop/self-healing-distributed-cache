package com.cache.manager;

import com.cache.manager.node.NodeProcessManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ApplicationContext;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

@SpringBootApplication
@EnableScheduling
public class ManagerApplication {

    private static final Logger log = LoggerFactory.getLogger(ManagerApplication.class);

    static {
        if ("Asia/Calcutta".equalsIgnoreCase(TimeZone.getDefault().getID())) {
            TimeZone.setDefault(TimeZone.getTimeZone("Asia/Kolkata"));
        }
    }

    public static void main(String[] args) {
        ApplicationContext ctx = SpringApplication.run(ManagerApplication.class, args);
        NodeProcessManager processManager = ctx.getBean(NodeProcessManager.class);
        processManager.startAllNodes();

        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            log.info("Shutting down - stopping worker nodes");
            processManager.killAllNodes();
        }));
    }
}
