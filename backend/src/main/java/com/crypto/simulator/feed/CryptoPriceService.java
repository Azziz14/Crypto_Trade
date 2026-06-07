package com.crypto.simulator.feed;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Service for managing real-time crypto price data.
 * Handles storage and retrieval of price history from MongoDB.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class CryptoPriceService {

    private final CryptoPriceRepository cryptoPriceRepository;

    /**
     * Save new price data.
     */
    public CryptoPrice savePriceData(String pair, String symbol, BigDecimal price,
                                      BigDecimal high, BigDecimal low, BigDecimal volume,
                                      BigDecimal priceChange, String timeframe, Long timestamp) {
        CryptoPrice cryptoPrice = CryptoPrice.builder()
                .symbol(symbol)
                .pair(pair)
                .currentPrice(price)
                .highPrice(high)
                .lowPrice(low)
                .volume(volume)
                .priceChange24h(priceChange)
                .timeframe(timeframe)
                .timestamp(timestamp)
                .recordedAt(LocalDateTime.now())
                .build();

        return cryptoPriceRepository.save(cryptoPrice);
    }

    /**
     * Get latest price for a symbol.
     */
    public CryptoPrice getLatestPrice(String symbol) {
        return cryptoPriceRepository.findTopBySymbolOrderByRecordedAtDesc(symbol)
                .orElseThrow(() -> new RuntimeException("No price data found for symbol: " + symbol));
    }

    /**
     * Get latest price for a pair and timeframe.
     */
    public CryptoPrice getLatestPrice(String pair, String timeframe) {
        return cryptoPriceRepository.findTopByPairAndTimeframeOrderByRecordedAtDesc(pair, timeframe)
                .orElseThrow(() -> new RuntimeException("No price data found for pair: " + pair + " and timeframe: " + timeframe));
    }

    /**
     * Get price history for a symbol.
     */
    public java.util.List<CryptoPrice> getPriceHistory(String symbol, LocalDateTime startTime, LocalDateTime endTime) {
        return cryptoPriceRepository.findBySymbolAndRecordedAtBetweenOrderByRecordedAtDesc(
                symbol, startTime, endTime);
    }

    /**
     * Get latest prices for all trading pairs.
     */
    public java.util.List<CryptoPrice> getAllLatestPrices() {
        return cryptoPriceRepository.findLatestPricesForAllSymbols();
    }

    /**
     * Cleanup old price data (keep last 90 days).
     */
    @Scheduled(cron = "0 0 2 * * *")  // Run daily at 2 AM
    public void cleanupOldPriceData() {
        try {
            LocalDateTime ninetyDaysAgo = LocalDateTime.now().minusDays(90);
            long startTime = System.currentTimeMillis();
            // Additional cleanup logic can be added here
            log.info("Price data cleanup completed in {} ms", System.currentTimeMillis() - startTime);
        } catch (Exception e) {
            log.error("Error during price data cleanup", e);
        }
    }
}
