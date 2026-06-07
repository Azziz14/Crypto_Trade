package com.crypto.simulator.admin;

import com.crypto.simulator.auth.User;
import com.crypto.simulator.auth.UserRepository;
import com.crypto.simulator.config.WebSocketSessionListener;
import com.crypto.simulator.feed.BinanceWSClient;
import com.crypto.simulator.portfolio.HoldingRepository;
import com.crypto.simulator.trade.TradeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@CrossOrigin
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final BinanceWSClient binanceWSClient;
    private final UserRepository userRepository;
    private final HoldingRepository holdingRepository;
    private final TradeRepository tradeRepository;
    private final WebSocketSessionListener webSocketSessionListener;

    @PostMapping("/pairs")
    public ResponseEntity<?> updateTradingPairs(@RequestBody List<String> newPairs) {
        if (newPairs == null || newPairs.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Trading pairs list cannot be empty!"));
        }
        try {
            binanceWSClient.updateTradingPairs(newPairs);
            return ResponseEntity.ok(Map.of(
                    "message", "Active trading pairs updated successfully!",
                    "activePairs", binanceWSClient.getActiveTradingPairs()
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to update trading pairs: " + e.getMessage()));
        }
    }

    @PostMapping("/reset/{userId}")
    @Transactional
    @CacheEvict(value = "leaderboard", allEntries = true)
    public ResponseEntity<?> resetUser(@PathVariable Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + userId));

        try {
            // 1. Delete all holdings
            holdingRepository.deleteByUserId(userId);

            // 2. Delete all trades
            tradeRepository.deleteByUserId(userId);

            // 3. Reset virtual balance to initial balance
            user.setVirtualBalance(user.getInitialBalance());
            userRepository.save(user);

            return ResponseEntity.ok(Map.of("message", "User portfolio reset successfully for: " + user.getEmail()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to reset user: " + e.getMessage()));
        }
    }

    @GetMapping("/metrics")
    public ResponseEntity<?> getPlatformMetrics() {
        try {
            Map<String, Object> metrics = new HashMap<>();
            metrics.put("activeWebSocketSessions", webSocketSessionListener.getActiveSessionCount());
            metrics.put("activeTradingPairs", binanceWSClient.getActiveTradingPairs());
            metrics.put("totalVolumeINR", tradeRepository.sumTotalValue());
            metrics.put("totalUsers", userRepository.count());
            metrics.put("totalTrades", tradeRepository.count());
            return ResponseEntity.ok(metrics);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to fetch platform metrics: " + e.getMessage()));
        }
    }
}
