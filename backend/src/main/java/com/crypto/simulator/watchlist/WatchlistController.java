package com.crypto.simulator.watchlist;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/watchlist")
@RequiredArgsConstructor
@CrossOrigin
public class WatchlistController {

    private final WatchlistService watchlistService;

    @GetMapping
    public ResponseEntity<?> getWatchlist(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized access!"));
        }

        try {
            List<WatchlistDTO> list = watchlistService.getWatchlist(principal.getName());
            return ResponseEntity.ok(list);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{symbol}")
    public ResponseEntity<?> addSymbol(@PathVariable String symbol, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized access!"));
        }

        try {
            watchlistService.addSymbol(principal.getName(), symbol);
            return ResponseEntity.ok(Map.of("message", "Symbol successfully added to watchlist!", "symbol", symbol.toUpperCase()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "An internal error occurred."));
        }
    }

    @DeleteMapping("/{symbol}")
    public ResponseEntity<?> removeSymbol(@PathVariable String symbol, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized access!"));
        }

        try {
            watchlistService.removeSymbol(principal.getName(), symbol);
            return ResponseEntity.ok(Map.of("message", "Symbol successfully removed from watchlist!", "symbol", symbol.toUpperCase()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "An internal error occurred."));
        }
    }
}
