package com.crypto.simulator.feed;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Component
@Profile("dev")
@RequiredArgsConstructor
public class InMemoryPricePublisher implements PricePublisher {

    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void publish(String symbol, BigDecimal price) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("symbol", symbol.toUpperCase());
        payload.put("price", price);
        payload.put("timestamp", System.currentTimeMillis());
        
        // Broadcast directly to the STOMP broker channel
        messagingTemplate.convertAndSend("/topic/prices/" + symbol.toUpperCase(), payload);
    }
}
