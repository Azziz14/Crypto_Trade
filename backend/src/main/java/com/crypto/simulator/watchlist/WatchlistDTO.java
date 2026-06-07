package com.crypto.simulator.watchlist;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WatchlistDTO {
    private String symbol;
    private LocalDateTime addedAt;
    private BigDecimal currentPrice;
}
