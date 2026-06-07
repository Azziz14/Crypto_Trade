package com.crypto.simulator.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Per-IP rate-limiting interceptor using the token-bucket algorithm.
 * Uses Bucket4j v8 API (com.bucket4j:bucket4j_jdk17-core).
 *
 * Limits:
 *   - Auth endpoints (/login, /register, /verify, /forgot, /reset): 10 req/min
 *   - All other endpoints: 60 req/min
 */
@Component
@Slf4j
public class RateLimitingInterceptor implements HandlerInterceptor {

    private static final int GLOBAL_LIMIT = 60;
    private static final int AUTH_LIMIT   = 10;

    // Separate bucket maps for different limits
    private final Map<String, Bucket> globalBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> authBuckets   = new ConcurrentHashMap<>();

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) throws Exception {

        String clientIp = resolveClientIp(request);
        String path     = request.getRequestURI();

        boolean isAuthPath = path.contains("/api/auth");
        Bucket bucket = isAuthPath
                ? authBuckets.computeIfAbsent(clientIp, ip -> buildBucket(AUTH_LIMIT))
                : globalBuckets.computeIfAbsent(clientIp, ip -> buildBucket(GLOBAL_LIMIT));

        if (bucket.tryConsume(1)) {
            return true;
        }

        response.setStatus(429);   // HTTP 429 Too Many Requests
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"Too many requests. Please try again later.\"}");
        log.warn("[RATE_LIMIT] IP {} exceeded limit on {}", clientIp, path);
        return false;
    }

    private Bucket buildBucket(int requestsPerMinute) {
        Bandwidth limit = Bandwidth.builder()
                .capacity(requestsPerMinute)
                .refillIntervally(requestsPerMinute, Duration.ofMinutes(1))
                .build();
        return Bucket.builder().addLimit(limit).build();
    }

    private String resolveClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
        String xri = request.getHeader("X-Real-IP");
        if (xri != null && !xri.isBlank()) return xri;
        return request.getRemoteAddr();
    }
}
