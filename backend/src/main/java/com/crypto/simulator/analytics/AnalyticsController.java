package com.crypto.simulator.analytics;

import com.crypto.simulator.auth.User;
import com.crypto.simulator.auth.UserService;
import com.crypto.simulator.trade.Trade;
import com.crypto.simulator.trade.TradeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin
public class AnalyticsController {

    private final TradeHistoryService tradeHistoryService;
    private final LeaderboardService leaderboardService;
    private final UserService userService;
    private final TradeRepository tradeRepository;

    @GetMapping("/trades")
    public ResponseEntity<?> getTrades(
            @RequestParam(required = false) String symbol,
            @RequestParam(required = false) String tradeType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "executedAt,desc") String sort,
            Principal principal) {

        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized access!"));
        }

        try {
            User user = userService.getUserByEmail(principal.getName());
            
            // Handle sorting parsing
            String[] sortParams = sort.split(",");
            String sortField = sortParams[0];
            Sort.Direction sortDirection = Sort.Direction.DESC;
            if (sortParams.length > 1 && sortParams[1].equalsIgnoreCase("asc")) {
                sortDirection = Sort.Direction.ASC;
            }
            Pageable pageable = PageRequest.of(page, size, Sort.by(sortDirection, sortField));

            Page<Trade> tradePage = tradeHistoryService.getTradeHistory(
                    user.getId(), symbol, tradeType, startDate, endDate, pageable
            );
            return ResponseEntity.ok(tradePage);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to retrieve trade history: " + e.getMessage()));
        }
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<?> getLeaderboard(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized access!"));
        }

        try {
            List<LeaderboardUserDTO> leaderboard = leaderboardService.getLeaderboard();
            return ResponseEntity.ok(leaderboard);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to retrieve leaderboard: " + e.getMessage()));
        }
    }

    @GetMapping("/analytics/pnl")
    public ResponseEntity<?> getRealizedPnL(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized access!"));
        }

        try {
            User user = userService.getUserByEmail(principal.getName());
            List<Trade> userTrades = tradeRepository.findByUserIdOrderByExecutedAtAsc(user.getId());
            Map<String, BigDecimal> pnlMap = FifoPnLCalculator.calculateRealizedPnL(userTrades);
            return ResponseEntity.ok(pnlMap);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to calculate realized PnL: " + e.getMessage()));
        }
    }
}
