package com.crypto.simulator.feed;

import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.util.Collections;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class PriceRegistry {

    private final ConcurrentHashMap<String, BigDecimal> prices = new ConcurrentHashMap<>();

    public void updatePrice(String symbol, BigDecimal price) {
        if (symbol != null && price != null) {
            prices.put(symbol.toUpperCase(), price);
        }
    }

    public BigDecimal getPrice(String symbol) {
        if (symbol == null) return null;
        return prices.get(symbol.toUpperCase());
    }

    public Map<String, BigDecimal> getAllPrices() {
        return Collections.unmodifiableMap(prices);
    }

    public boolean hasPrice(String symbol) {
        return symbol != null && prices.containsKey(symbol.toUpperCase());
    }
}
