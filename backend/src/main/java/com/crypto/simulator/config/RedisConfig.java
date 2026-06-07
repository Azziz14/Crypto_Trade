package com.crypto.simulator.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.data.redis.listener.adapter.MessageListenerAdapter;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import com.crypto.simulator.feed.PriceRegistry;
import java.math.BigDecimal;
import java.util.Map;

@Configuration
@Profile("prod")
@RequiredArgsConstructor
public class RedisConfig {

    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer(objectMapper));
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(new GenericJackson2JsonRedisSerializer(objectMapper));
        return template;
    }

    @Bean
    public RedisMessageListenerContainer container(RedisConnectionFactory connectionFactory,
                                                   MessageListenerAdapter listenerAdapter) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        // Subscribe to all symbol channels e.g. prices:BTCUSDT
        container.addMessageListener(listenerAdapter, new PatternTopic("prices:*"));
        return container;
    }

    @Bean
    public MessageListenerAdapter listenerAdapter(RedisPriceMessageListener listener) {
        return new MessageListenerAdapter(listener, "onMessage");
    }

    @Configuration
    @Profile("prod")
    public static class RedisPriceMessageListener {
        
        private final SimpMessagingTemplate messagingTemplate;
        private final ObjectMapper objectMapper;
        private final PriceRegistry priceRegistry;

        public RedisPriceMessageListener(SimpMessagingTemplate messagingTemplate, ObjectMapper objectMapper, PriceRegistry priceRegistry) {
            this.messagingTemplate = messagingTemplate;
            this.objectMapper = objectMapper;
            this.priceRegistry = priceRegistry;
        }

        @SuppressWarnings("unchecked")
        public void onMessage(String message, String channel) {
            try {
                // Parse the channel name to get the symbol e.g., prices:BTCUSDT -> BTCUSDT
                String symbol = channel.substring(channel.indexOf(":") + 1).toUpperCase();
                Map<String, Object> payload = objectMapper.readValue(message, Map.class);
                
                // Update local O(1) in-memory price registry (ensures cluster consistency)
                if (payload.containsKey("price")) {
                    BigDecimal price = new BigDecimal(payload.get("price").toString());
                    priceRegistry.updatePrice(symbol, price);
                }
                
                // Broadcast received Redis pub/sub tick over STOMP WebSocket
                messagingTemplate.convertAndSend("/topic/prices/" + symbol, payload);
            } catch (Exception e) {
                // Log serialization errors
            }
        }
    }
}
