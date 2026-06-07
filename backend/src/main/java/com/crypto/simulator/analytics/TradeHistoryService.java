package com.crypto.simulator.analytics;

import com.crypto.simulator.trade.Trade;
import com.crypto.simulator.trade.TradeRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TradeHistoryService {

    private final TradeRepository tradeRepository;

    public Page<Trade> getTradeHistory(Long userId, String symbol, String tradeType, 
                                      LocalDateTime startDate, LocalDateTime endDate, Pageable pageable) {
        Specification<Trade> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            predicates.add(cb.equal(root.get("userId"), userId));

            if (symbol != null && !symbol.trim().isEmpty()) {
                predicates.add(cb.equal(cb.upper(root.get("symbol")), symbol.trim().toUpperCase()));
            }

            if (tradeType != null && !tradeType.trim().isEmpty()) {
                predicates.add(cb.equal(cb.upper(root.get("tradeType")), tradeType.trim().toUpperCase()));
            }

            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("executedAt"), startDate));
            }

            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("executedAt"), endDate));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return tradeRepository.findAll(spec, pageable);
    }
}
