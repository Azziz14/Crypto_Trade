package com.crypto.simulator.trade;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import java.math.BigDecimal;
import java.util.List;

@Repository
public interface TradeRepository extends JpaRepository<Trade, Long>, JpaSpecificationExecutor<Trade> {
    Page<Trade> findByUserId(Long userId, Pageable pageable);
    List<Trade> findByUserIdOrderByExecutedAtAsc(Long userId);
    void deleteByUserId(Long userId);

    @Query("SELECT COALESCE(SUM(t.totalValue), 0) FROM Trade t")
    BigDecimal sumTotalValue();
}
