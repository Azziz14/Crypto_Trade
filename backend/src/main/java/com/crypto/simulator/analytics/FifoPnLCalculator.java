package com.crypto.simulator.analytics;

import com.crypto.simulator.trade.Trade;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

public class FifoPnLCalculator {

    public static Map<String, BigDecimal> calculateRealizedPnL(List<Trade> trades) {
        // Group trades by symbol
        Map<String, List<Trade>> tradesBySymbol = new HashMap<>();
        for (Trade t : trades) {
            tradesBySymbol.computeIfAbsent(t.getSymbol().toUpperCase(), k -> new ArrayList<>()).add(t);
        }

        Map<String, BigDecimal> realizedPnLMap = new HashMap<>();

        for (Map.Entry<String, List<Trade>> entry : tradesBySymbol.entrySet()) {
            String symbol = entry.getKey();
            List<Trade> symbolTrades = entry.getValue();
            
            // Sort chronologically just in case
            symbolTrades.sort(Comparator.comparing(Trade::getExecutedAt));

            Queue<BuyLot> buyQueue = new LinkedList<>();
            BigDecimal totalPnL = BigDecimal.ZERO;

            for (Trade trade : symbolTrades) {
                if (trade.getTradeType().equalsIgnoreCase("BUY")) {
                    buyQueue.offer(new BuyLot(trade.getQuantity(), trade.getPrice()));
                } else if (trade.getTradeType().equalsIgnoreCase("SELL")) {
                    BigDecimal sellQtyRemaining = trade.getQuantity();
                    BigDecimal sellPrice = trade.getPrice();

                    while (sellQtyRemaining.compareTo(BigDecimal.ZERO) > 0 && !buyQueue.isEmpty()) {
                        BuyLot oldestBuy = buyQueue.peek();
                        
                        if (oldestBuy.quantity.compareTo(sellQtyRemaining) <= 0) {
                            // Fully consume this buy lot
                            BigDecimal profitPerUnit = sellPrice.subtract(oldestBuy.price);
                            BigDecimal realizedPnL = oldestBuy.quantity.multiply(profitPerUnit);
                            totalPnL = totalPnL.add(realizedPnL);

                            sellQtyRemaining = sellQtyRemaining.subtract(oldestBuy.quantity);
                            buyQueue.poll(); // Remove from queue
                        } else {
                            // Partially consume this buy lot
                            BigDecimal profitPerUnit = sellPrice.subtract(oldestBuy.price);
                            BigDecimal realizedPnL = sellQtyRemaining.multiply(profitPerUnit);
                            totalPnL = totalPnL.add(realizedPnL);

                            oldestBuy.quantity = oldestBuy.quantity.subtract(sellQtyRemaining);
                            sellQtyRemaining = BigDecimal.ZERO; // Sell order fully filled
                        }
                    }
                }
            }
            realizedPnLMap.put(symbol, totalPnL.setScale(8, RoundingMode.HALF_UP));
        }

        return realizedPnLMap;
    }

    private static class BuyLot {
        BigDecimal quantity;
        BigDecimal price;

        BuyLot(BigDecimal quantity, BigDecimal price) {
            this.quantity = quantity;
            this.price = price;
        }
    }
}
