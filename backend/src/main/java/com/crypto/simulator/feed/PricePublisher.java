package com.crypto.simulator.feed;

import java.math.BigDecimal;

public interface PricePublisher {
    void publish(String symbol, BigDecimal price);
}
