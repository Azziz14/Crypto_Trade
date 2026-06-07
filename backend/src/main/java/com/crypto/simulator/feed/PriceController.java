package com.crypto.simulator.feed;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/prices")
@RequiredArgsConstructor
@CrossOrigin
public class PriceController {

    private final PriceRegistry priceRegistry;

    @GetMapping("/{symbol}")
    public ResponseEntity<?> getPrice(@PathVariable String symbol) {
        if (symbol == null || symbol.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Symbol must be specified!"));
        }
        
        String upperSymbol = symbol.toUpperCase().trim();
        BigDecimal price = priceRegistry.getPrice(upperSymbol);
        
        if (price == null) {
            return ResponseEntity.status(404).body(Map.of(
                "error", "Price not found for symbol: " + upperSymbol + ". Ticker stream may not be active/initialized yet."
            ));
        }
        
        return ResponseEntity.ok(Map.of(
            "symbol", upperSymbol,
            "price", price,
            "timestamp", System.currentTimeMillis()
        ));
    }

    @GetMapping
    public ResponseEntity<?> getAllPrices() {
        return ResponseEntity.ok(priceRegistry.getAllPrices());
    }
}
