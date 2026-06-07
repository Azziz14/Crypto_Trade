package com.crypto.simulator.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeaderboardUserDTO {
    private Long userId;
    private String email;
    private BigDecimal cashBalance;
    private BigDecimal holdingsValue;
    private BigDecimal totalPortfolioValue;
    private BigDecimal totalPnL;
    private BigDecimal totalPnLPercent;
}
