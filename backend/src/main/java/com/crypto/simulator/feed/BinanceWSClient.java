package com.crypto.simulator.feed;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.net.URI;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

@Component
public class BinanceWSClient {

    private static final Logger log = LoggerFactory.getLogger(BinanceWSClient.class);

    private final PriceRegistry priceRegistry;
    private final PricePublisher pricePublisher;
    private final ObjectMapper objectMapper;

    @Value("${app.trading-pairs}")
    private String configuredTradingPairs;

    private final List<String> activeTradingPairs = new CopyOnWriteArrayList<>();
    private InternalWebSocketClient wsClient;
    private boolean isClosing = false;
    private int reconnectAttempts = 0;

    public BinanceWSClient(PriceRegistry priceRegistry, PricePublisher pricePublisher, ObjectMapper objectMapper) {
        this.priceRegistry = priceRegistry;
        this.pricePublisher = pricePublisher;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public synchronized void init() {
        if (configuredTradingPairs != null && !configuredTradingPairs.isEmpty()) {
            activeTradingPairs.addAll(
                    Arrays.stream(configuredTradingPairs.split(","))
                            .map(String::trim)
                            .map(String::toUpperCase)
                            .collect(Collectors.toList())
            );
        }
        connectToBinance();
    }

    public synchronized void updateTradingPairs(List<String> newPairs) {
        log.info("Updating active trading pairs to: {}", newPairs);
        activeTradingPairs.clear();
        activeTradingPairs.addAll(
                newPairs.stream()
                        .map(String::trim)
                        .map(String::toUpperCase)
                        .collect(Collectors.toList())
        );
        
        // Reconnect with new stream endpoints
        disconnect();
        connectToBinance();
    }

    public List<String> getActiveTradingPairs() {
        return List.copyOf(activeTradingPairs);
    }

    private synchronized void connectToBinance() {
        if (activeTradingPairs.isEmpty()) {
            log.warn("No trading pairs configured. Binance WS Client will not start.");
            return;
        }

        try {
            // Build streams path: btcusdt@ticker/ethusdt@ticker/etc
            String streams = activeTradingPairs.stream()
                    .map(pair -> pair.toLowerCase() + "@ticker")
                    .collect(Collectors.joining("/"));

            String socketUrl = "wss://stream.binance.com:9443/ws/" + streams;
            log.info("Connecting to Binance WebSocket: {}", socketUrl);

            isClosing = false;
            wsClient = new InternalWebSocketClient(new URI(socketUrl));
            wsClient.connect();
        } catch (Exception e) {
            log.error("Failed to construct Binance WS client URI", e);
            scheduleReconnect();
        }
    }

    public synchronized void disconnect() {
        isClosing = true;
        if (wsClient != null) {
            try {
                wsClient.closeBlocking();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            wsClient = null;
        }
    }

    @PreDestroy
    public void cleanup() {
        disconnect();
    }

    private synchronized void scheduleReconnect() {
        if (isClosing) return;
        
        reconnectAttempts++;
        long delay = Math.min(60000, (long) Math.pow(2, reconnectAttempts) * 1000); // Exponential backoff up to 60s
        log.info("Scheduling Binance WS reconnect in {}ms (Attempt {})", delay, reconnectAttempts);

        new Thread(() -> {
            try {
                Thread.sleep(delay);
                synchronized (BinanceWSClient.this) {
                    if (!isClosing && (wsClient == null || !wsClient.isOpen())) {
                        log.info("Attempting to reconnect to Binance WS...");
                        connectToBinance();
                    }
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }).start();
    }

    @Scheduled(fixedRate = 300000) // 5-minute heartbeat check
    public synchronized void checkConnectionHealth() {
        if (isClosing) return;
        
        if (wsClient == null || !wsClient.isOpen()) {
            log.warn("Binance WS client is down or uninitialized. Triggering reconnect...");
            connectToBinance();
        } else {
            // Send ping to keep connection alive
            log.debug("Sending heartbeat ping to Binance...");
            wsClient.sendPing();
        }
    }

    public boolean isConnected() {
        return wsClient != null && wsClient.isOpen();
    }

    private class InternalWebSocketClient extends WebSocketClient {

        public InternalWebSocketClient(URI serverUri) {
            super(serverUri);
        }

        @Override
        public void onOpen(ServerHandshake handshakedata) {
            log.info("Successfully connected to Binance public WebSocket stream.");
            reconnectAttempts = 0; // Reset reconnect counter
        }

        @Override
        public void onMessage(String message) {
            try {
                JsonNode json = objectMapper.readTree(message);
                
                // Binance streams can send individual ticks directly on multi-streams
                if (json.has("s") && json.has("c")) {
                    String symbol = json.get("s").asText().toUpperCase();
                    BigDecimal rawPrice = new BigDecimal(json.get("c").asText());
                    
                    // Convert USD to INR natively
                    BigDecimal inrPrice = rawPrice.multiply(new BigDecimal("83.50"));
                    
                    // 1. Update in-memory registry (O(1) read source of truth)
                    priceRegistry.updatePrice(symbol, inrPrice);
                    
                    // 2. Publish (delegates to direct WS or Redis depending on active profile)
                    pricePublisher.publish(symbol, inrPrice);
                }
            } catch (Exception e) {
                log.error("Error parsing Binance WebSocket tick payload: " + message, e);
            }
        }

        @Override
        public void onClose(int code, String reason, boolean remote) {
            log.warn("Binance WebSocket closed. Code: {}, Reason: {}, Remote: {}", code, reason, remote);
            if (!isClosing) {
                scheduleReconnect();
            }
        }

        @Override
        public void onError(Exception ex) {
            log.error("Binance WebSocket experienced an error", ex);
            if (!isClosing) {
                scheduleReconnect();
            }
        }
    }
}
