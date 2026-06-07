package com.crypto.simulator.analytics;

import com.crypto.simulator.auth.User;
import com.crypto.simulator.auth.UserRepository;
import com.crypto.simulator.feed.PriceRegistry;
import com.crypto.simulator.portfolio.Holding;
import com.crypto.simulator.portfolio.HoldingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LeaderboardService {

    private final UserRepository userRepository;
    private final HoldingRepository holdingRepository;
    private final PriceRegistry priceRegistry;

    @Cacheable(value = "leaderboard")
    public List<LeaderboardUserDTO> getLeaderboard() {
        List<User> users = userRepository.findAll();
        List<LeaderboardUserDTO> leaderboard = new ArrayList<>();

        for (User user : users) {
            List<Holding> holdings = holdingRepository.findByUserId(user.getId());
            BigDecimal holdingsValue = BigDecimal.ZERO;

            for (Holding h : holdings) {
                BigDecimal currentPrice = priceRegistry.getPrice(h.getSymbol());
                if (currentPrice == null) {
                    currentPrice = h.getAvgBuyPrice();
                }
                BigDecimal marketValue = h.getQuantity().multiply(currentPrice).setScale(8, RoundingMode.HALF_UP);
                holdingsValue = holdingsValue.add(marketValue);
            }

            BigDecimal totalValue = user.getVirtualBalance().add(holdingsValue).setScale(8, RoundingMode.HALF_UP);
            BigDecimal totalPnL = totalValue.subtract(user.getInitialBalance()).setScale(8, RoundingMode.HALF_UP);
            BigDecimal totalPnLPercent = BigDecimal.ZERO;
            if (user.getInitialBalance().compareTo(BigDecimal.ZERO) > 0) {
                totalPnLPercent = totalPnL.multiply(BigDecimal.valueOf(100))
                        .divide(user.getInitialBalance(), 8, RoundingMode.HALF_UP);
            }

            leaderboard.add(LeaderboardUserDTO.builder()
                    .userId(user.getId())
                    .email(user.getEmail())
                    .cashBalance(user.getVirtualBalance())
                    .holdingsValue(holdingsValue)
                    .totalPortfolioValue(totalValue)
                    .totalPnL(totalPnL)
                    .totalPnLPercent(totalPnLPercent)
                    .build());
        }

        // Sort descending by total portfolio value
        return leaderboard.stream()
                .sorted(Comparator.comparing(LeaderboardUserDTO::getTotalPortfolioValue).reversed())
                .collect(Collectors.toList());
    }
}
