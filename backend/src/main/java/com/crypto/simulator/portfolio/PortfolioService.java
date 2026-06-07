package com.crypto.simulator.portfolio;

import com.crypto.simulator.auth.User;
import com.crypto.simulator.auth.UserRepository;
import com.crypto.simulator.feed.PriceRegistry;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PortfolioService {

    private static final Logger log = LoggerFactory.getLogger(PortfolioService.class);

    private final UserRepository userRepository;
    private final HoldingRepository holdingRepository;
    private final PriceRegistry priceRegistry;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional(readOnly = true)
    public PortfolioResponse getPortfolio(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));
        
        return calculatePortfolio(user);
    }

    @Transactional(readOnly = true)
    public PortfolioResponse getPortfolioById(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));
        
        return calculatePortfolio(user);
    }

    private PortfolioResponse calculatePortfolio(User user) {
        List<Holding> dbHoldings = holdingRepository.findByUserId(user.getId());
        List<HoldingDTO> holdingDTOs = new ArrayList<>();
        BigDecimal totalHoldingsValue = BigDecimal.ZERO;

        for (Holding h : dbHoldings) {
            // Get current price from in-memory registry, default to avgBuyPrice if not available yet
            BigDecimal currentPrice = priceRegistry.getPrice(h.getSymbol());
            if (currentPrice == null) {
                currentPrice = h.getAvgBuyPrice();
            }

            BigDecimal marketValue = h.getQuantity().multiply(currentPrice).setScale(8, RoundingMode.HALF_UP);
            totalHoldingsValue = totalHoldingsValue.add(marketValue);

            BigDecimal totalCost = h.getQuantity().multiply(h.getAvgBuyPrice()).setScale(8, RoundingMode.HALF_UP);
            BigDecimal unrealizedPnL = marketValue.subtract(totalCost).setScale(8, RoundingMode.HALF_UP);
            
            BigDecimal unrealizedPnLPercent = BigDecimal.ZERO;
            if (h.getAvgBuyPrice().compareTo(BigDecimal.ZERO) > 0) {
                unrealizedPnLPercent = currentPrice.subtract(h.getAvgBuyPrice())
                        .multiply(BigDecimal.valueOf(100))
                        .divide(h.getAvgBuyPrice(), 8, RoundingMode.HALF_UP);
            }

            holdingDTOs.add(HoldingDTO.builder()
                    .symbol(h.getSymbol())
                    .quantity(h.getQuantity())
                    .avgBuyPrice(h.getAvgBuyPrice())
                    .currentPrice(currentPrice)
                    .marketValue(marketValue)
                    .unrealizedPnL(unrealizedPnL)
                    .unrealizedPnLPercent(unrealizedPnLPercent)
                    .build());
        }

        BigDecimal totalPortfolioValue = user.getVirtualBalance().add(totalHoldingsValue).setScale(8, RoundingMode.HALF_UP);
        BigDecimal totalPnL = totalPortfolioValue.subtract(user.getInitialBalance()).setScale(8, RoundingMode.HALF_UP);
        
        BigDecimal totalPnLPercent = BigDecimal.ZERO;
        if (user.getInitialBalance().compareTo(BigDecimal.ZERO) > 0) {
            totalPnLPercent = totalPnL.multiply(BigDecimal.valueOf(100))
                    .divide(user.getInitialBalance(), 8, RoundingMode.HALF_UP);
        }

        return PortfolioResponse.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .cashBalance(user.getVirtualBalance())
                .initialBalance(user.getInitialBalance())
                .totalPortfolioValue(totalPortfolioValue)
                .totalPnL(totalPnL)
                .totalPnLPercent(totalPnLPercent)
                .holdings(holdingDTOs)
                .build();
    }

    public void broadcastPortfolioUpdate(Long userId) {
        try {
            PortfolioResponse response = getPortfolioById(userId);
            String destination = "/topic/portfolio/" + userId;
            log.info("Broadcasting portfolio update to WS channel: {}", destination);
            messagingTemplate.convertAndSend(destination, response);
        } catch (Exception e) {
            log.error("Failed to broadcast portfolio update for user " + userId, e);
        }
    }
}
