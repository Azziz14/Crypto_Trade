package com.crypto.simulator.trade;

import com.crypto.simulator.auth.User;
import com.crypto.simulator.auth.UserRepository;
import com.crypto.simulator.feed.PriceRegistry;
import com.crypto.simulator.portfolio.Holding;
import com.crypto.simulator.portfolio.HoldingRepository;
import com.crypto.simulator.portfolio.PortfolioService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class TradeExecutionService {

    private static final Logger log = LoggerFactory.getLogger(TradeExecutionService.class);

    private final UserRepository userRepository;
    private final HoldingRepository holdingRepository;
    private final TradeRepository tradeRepository;
    private final PriceRegistry priceRegistry;
    private final PortfolioService portfolioService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    @CacheEvict(value = "leaderboard", allEntries = true)
    public TradeResponse executeBuy(String email, String symbol, BigDecimal quantity) {
        validateInput(symbol, quantity);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));

        BigDecimal executionPrice = priceRegistry.getPrice(symbol);
        if (executionPrice == null) {
            throw new IllegalStateException("Live price not available for " + symbol.toUpperCase() + ". Please wait for ticker stream to initialize!");
        }

        BigDecimal totalCost = quantity.multiply(executionPrice).setScale(8, RoundingMode.HALF_UP);
        if (user.getVirtualBalance().compareTo(totalCost) < 0) {
            throw new IllegalArgumentException(String.format("Insufficient funds! Required: \u20B9%s, Available: \u20B9%s", 
                    totalCost.toPlainString(), user.getVirtualBalance().toPlainString()));
        }

        // Deduct INR balance
        user.setVirtualBalance(user.getVirtualBalance().subtract(totalCost));
        userRepository.save(user);

        // Update Holdings
        Holding holding = holdingRepository.findByUserIdAndSymbol(user.getId(), symbol.toUpperCase()).orElse(null);
        if (holding == null) {
            holding = Holding.builder()
                    .userId(user.getId())
                    .symbol(symbol.toUpperCase())
                    .quantity(quantity)
                    .avgBuyPrice(executionPrice)
                    .build();
        } else {
            BigDecimal oldQuantity = holding.getQuantity();
            BigDecimal newQuantity = oldQuantity.add(quantity);
            
            // Weighted average price: ((oldQty * oldAvg) + (newQty * currentPrice)) / totalQty
            BigDecimal totalCostBasis = oldQuantity.multiply(holding.getAvgBuyPrice())
                    .add(quantity.multiply(executionPrice));
            BigDecimal newAvgBuyPrice = totalCostBasis.divide(newQuantity, 8, RoundingMode.HALF_UP);
            
            holding.setQuantity(newQuantity);
            holding.setAvgBuyPrice(newAvgBuyPrice);
        }
        holdingRepository.save(holding);

        // Create Trade Log
        Trade trade = Trade.builder()
                .userId(user.getId())
                .symbol(symbol.toUpperCase())
                .tradeType("BUY")
                .quantity(quantity)
                .price(executionPrice)
                .totalValue(totalCost)
                .executedAt(LocalDateTime.now())
                .build();
        tradeRepository.save(trade);

        TradeResponse response = buildTradeResponse(user.getEmail(), trade, user.getVirtualBalance());
        
        // Broadcast updates asynchronously/after transaction commit
        sendNotifications(user.getId(), user.getEmail(), response);

        return response;
    }

    @Transactional
    @CacheEvict(value = "leaderboard", allEntries = true)
    public TradeResponse executeSell(String email, String symbol, BigDecimal quantity) {
        validateInput(symbol, quantity);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));

        BigDecimal executionPrice = priceRegistry.getPrice(symbol);
        if (executionPrice == null) {
            throw new IllegalStateException("Live price not available for " + symbol.toUpperCase() + ". Please wait for ticker stream to initialize!");
        }

        Holding holding = holdingRepository.findByUserIdAndSymbol(user.getId(), symbol.toUpperCase())
                .orElseThrow(() -> new IllegalArgumentException("You do not hold any position in " + symbol.toUpperCase()));

        if (holding.getQuantity().compareTo(quantity) < 0) {
            throw new IllegalArgumentException(String.format("Insufficient holdings! Required: %s, Available: %s", 
                    quantity.toPlainString(), holding.getQuantity().toPlainString()));
        }

        BigDecimal totalCredit = quantity.multiply(executionPrice).setScale(8, RoundingMode.HALF_UP);

        // Add INR balance
        user.setVirtualBalance(user.getVirtualBalance().add(totalCredit));
        userRepository.save(user);

        // Update holdings
        BigDecimal remainingQuantity = holding.getQuantity().subtract(quantity);
        if (remainingQuantity.compareTo(new BigDecimal("0.00000001")) <= 0) {
            // Remove position if fully closed or negligible remainder
            holdingRepository.delete(holding);
        } else {
            holding.setQuantity(remainingQuantity);
            holdingRepository.save(holding);
        }

        // Create Trade Log
        Trade trade = Trade.builder()
                .userId(user.getId())
                .symbol(symbol.toUpperCase())
                .tradeType("SELL")
                .quantity(quantity)
                .price(executionPrice)
                .totalValue(totalCredit)
                .executedAt(LocalDateTime.now())
                .build();
        tradeRepository.save(trade);

        TradeResponse response = buildTradeResponse(user.getEmail(), trade, user.getVirtualBalance());

        // Broadcast updates
        sendNotifications(user.getId(), user.getEmail(), response);

        return response;
    }

    private void validateInput(String symbol, BigDecimal quantity) {
        if (symbol == null || symbol.trim().isEmpty()) {
            throw new IllegalArgumentException("Symbol must be specified!");
        }
        if (quantity == null || quantity.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Quantity must be greater than zero!");
        }
    }

    private TradeResponse buildTradeResponse(String email, Trade trade, BigDecimal newBalance) {
        return TradeResponse.builder()
                .tradeId(trade.getId())
                .email(email)
                .symbol(trade.getSymbol())
                .tradeType(trade.getTradeType())
                .quantity(trade.getQuantity())
                .price(trade.getPrice())
                .totalValue(trade.getTotalValue())
                .newCashBalance(newBalance)
                .executedAt(trade.getExecutedAt())
                .build();
    }

    private void sendNotifications(Long userId, String email, TradeResponse response) {
        // 1. Broadcast live portfolio updates via WebSocket channel /topic/portfolio/{userId}
        portfolioService.broadcastPortfolioUpdate(userId);

        // 2. Broadcast private confirmation back to the executing client queue
        String privateDest = "/queue/trades";
        log.info("Sending private trade confirmation to user {} on {}", email, privateDest);
        messagingTemplate.convertAndSendToUser(email, privateDest, response);
    }
}
