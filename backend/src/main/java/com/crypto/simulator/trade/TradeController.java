package com.crypto.simulator.trade;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/trade")
@RequiredArgsConstructor
@CrossOrigin
public class TradeController {

    private final TradeExecutionService tradeExecutionService;

    @PostMapping("/buy")
    public ResponseEntity<?> buy(@RequestBody OrderRequest request, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized access!"));
        }

        try {
            TradeResponse response = tradeExecutionService.executeBuy(
                    principal.getName(), 
                    request.getSymbol(), 
                    request.getQuantity()
            );
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            // Structured business validation error
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage(), "type", "VALIDATION_ERROR"));
        } catch (IllegalStateException e) {
            // Price registry not populated yet
            return ResponseEntity.status(503).body(Map.of("error", e.getMessage(), "type", "MARKET_DATA_OFFLINE"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "An internal error occurred during buy execution."));
        }
    }

    @PostMapping("/sell")
    public ResponseEntity<?> sell(@RequestBody OrderRequest request, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized access!"));
        }

        try {
            TradeResponse response = tradeExecutionService.executeSell(
                    principal.getName(), 
                    request.getSymbol(), 
                    request.getQuantity()
            );
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            // Structured business validation error
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage(), "type", "VALIDATION_ERROR"));
        } catch (IllegalStateException e) {
            // Price registry not populated yet
            return ResponseEntity.status(503).body(Map.of("error", e.getMessage(), "type", "MARKET_DATA_OFFLINE"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "An internal error occurred during sell execution."));
        }
    }
}
