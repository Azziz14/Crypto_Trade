package com.crypto.simulator.feed;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * MongoDB document for real-time crypto price data.
 * Stores price information with timestamps for historical tracking.
 */
@Document(collection = "crypto_prices")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CryptoPrice {

    @Id
    private String id;

    @Indexed
    private String symbol;      // BTC, ETH, SOL, etc.

    @Indexed
    private String pair;        // BTCUSDT, ETHUSDT, etc.

    private BigDecimal currentPrice;
    private BigDecimal openPrice;
    private BigDecimal highPrice;
    private BigDecimal lowPrice;
    private BigDecimal closePrice;

    private BigDecimal volume;      // 24h volume
    private BigDecimal marketCap;
    private BigDecimal priceChange24h;  // % change

    private Long timestamp;     // Unix timestamp from exchange

    @Indexed
    private LocalDateTime recordedAt;  // When we recorded this

    @Indexed
    private String timeframe;   // "1m", "5m", "1h", "1d"
}
