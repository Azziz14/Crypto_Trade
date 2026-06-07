package com.crypto.simulator.portfolio;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PortfolioResponse {
    private Long userId;
    private String email;
    private BigDecimal cashBalance;
    private BigDecimal initialBalance;
    private BigDecimal totalPortfolioValue;
    private BigDecimal totalPnL;
    private BigDecimal totalPnLPercent;
    private List<HoldingDTO> holdings;
}
