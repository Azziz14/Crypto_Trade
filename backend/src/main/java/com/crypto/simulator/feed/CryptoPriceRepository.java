package com.crypto.simulator.feed;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * MongoDB repository for crypto price data.
 * Enables querying historical price data for analysis.
 */
@Repository
public interface CryptoPriceRepository extends MongoRepository<CryptoPrice, String> {

    // Find latest price for a symbol
    Optional<CryptoPrice> findTopBySymbolOrderByRecordedAtDesc(String symbol);

    // Find latest price for a pair/timeframe
    Optional<CryptoPrice> findTopByPairAndTimeframeOrderByRecordedAtDesc(String pair, String timeframe);

    // Find all prices for a symbol within time range
    List<CryptoPrice> findBySymbolAndRecordedAtBetweenOrderByRecordedAtDesc(
            String symbol, LocalDateTime startTime, LocalDateTime endTime);

    // Find all prices for a pair within time range
    List<CryptoPrice> findByPairAndRecordedAtBetweenOrderByRecordedAtDesc(
            String pair, LocalDateTime startTime, LocalDateTime endTime);

    // Find prices for multiple symbols
    List<CryptoPrice> findBySymbolInOrderByRecordedAtDesc(List<String> symbols);

    // Find prices by timeframe
    List<CryptoPrice> findByTimeframeOrderByRecordedAtDesc(String timeframe);

    // Find latest prices for all symbols (1 per symbol)
    @Query(value = "{}", fields = "{ 'symbol': 1, 'currentPrice': 1, 'recordedAt': 1, 'priceChange24h': 1 }", sort = "{ 'recordedAt': -1 }")
    List<CryptoPrice> findLatestPricesForAllSymbols();
}
