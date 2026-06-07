package com.crypto.simulator.watchlist;

import com.crypto.simulator.auth.User;
import com.crypto.simulator.auth.UserRepository;
import com.crypto.simulator.feed.PriceRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class WatchlistService {

    private final UserRepository userRepository;
    private final WatchlistRepository watchlistRepository;
    private final PriceRegistry priceRegistry;

    @Transactional(readOnly = true)
    public List<WatchlistDTO> getWatchlist(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));

        List<Watchlist> dbWatchlist = watchlistRepository.findByUserId(user.getId());

        return dbWatchlist.stream()
                .map(item -> {
                    BigDecimal price = priceRegistry.getPrice(item.getSymbol());
                    return WatchlistDTO.builder()
                            .symbol(item.getSymbol())
                            .addedAt(item.getAddedAt())
                            .currentPrice(price) // Live current price (can be null if feed not active yet)
                            .build();
                })
                .collect(Collectors.toList());
    }

    public void addSymbol(String email, String symbol) {
        if (symbol == null || symbol.trim().isEmpty()) {
            throw new IllegalArgumentException("Symbol cannot be empty!");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));

        String upperSymbol = symbol.toUpperCase().trim();

        // Check if already in watchlist
        if (watchlistRepository.findByUserIdAndSymbol(user.getId(), upperSymbol).isPresent()) {
            return; // Already added, ignore
        }

        Watchlist watchlist = Watchlist.builder()
                .userId(user.getId())
                .symbol(upperSymbol)
                .addedAt(LocalDateTime.now())
                .build();

        watchlistRepository.save(watchlist);
    }

    public void removeSymbol(String email, String symbol) {
        if (symbol == null || symbol.trim().isEmpty()) {
            throw new IllegalArgumentException("Symbol cannot be empty!");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));

        String upperSymbol = symbol.toUpperCase().trim();

        Watchlist item = watchlistRepository.findByUserIdAndSymbol(user.getId(), upperSymbol)
                .orElseThrow(() -> new IllegalArgumentException("Symbol not in your watchlist: " + upperSymbol));

        watchlistRepository.delete(item);
    }
}
