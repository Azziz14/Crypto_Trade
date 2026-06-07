package com.crypto.simulator.feed;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Component
@Profile("prod")
@RequiredArgsConstructor
public class RedisPricePublisher implements PricePublisher {

    private final RedisTemplate<String, Object> redisTemplate;

    @Override
    public void publish(String symbol, BigDecimal price) {
        String channel = "prices:" + symbol.toUpperCase();
        
        Map<String, Object> payload = new HashMap<>();
        payload.put("symbol", symbol.toUpperCase());
        payload.put("price", price);
        payload.put("timestamp", System.currentTimeMillis());
        
        // Publish to Redis Pub/Sub topic
        redisTemplate.convertAndSend(channel, payload);
    }
}
