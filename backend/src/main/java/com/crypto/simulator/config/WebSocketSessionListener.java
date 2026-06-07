package com.crypto.simulator.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.concurrent.atomic.AtomicInteger;

@Component
public class WebSocketSessionListener {

    private static final Logger log = LoggerFactory.getLogger(WebSocketSessionListener.class);
    
    private final AtomicInteger activeSessions = new AtomicInteger(0);

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectEvent event) {
        int count = activeSessions.incrementAndGet();
        log.info("Received a new STOMP connection. Active sessions: {}", count);
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        int count = activeSessions.decrementAndGet();
        if (count < 0) {
            activeSessions.set(0);
            count = 0;
        }
        log.info("STOMP connection closed. Active sessions: {}", count);
    }

    public int getActiveSessionCount() {
        return activeSessions.get();
    }
}
