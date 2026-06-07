package com.crypto.simulator.auth;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import java.security.SecureRandom;
import java.time.Duration;

/**
 * Service for generating and verifying dynamic OTPs for login/password reset.
 * OTPs are stored in Redis with TTL for high performance and automatic cleanup.
 *
 * Redis key format:
 *   otp:{email}        — stores the OTP code for email-based delivery
 *   sms_otp:{email}    — stores the OTP code for SMS-based delivery
 *   otp_attempt:{email}— tracks OTP request rate limit
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class OtpService {

    private final RedisTemplate<String, String> redisTemplate;
    private final EmailService emailService;
    private final SmsOtpService smsOtpService;

    private static final String OTP_PREFIX = "otp:";
    private static final String OTP_ATTEMPT_PREFIX = "otp_attempt:";
    public  static final int OTP_LENGTH = 6;
    public  static final int OTP_VALIDITY_MINUTES = 5;
    private static final int MAX_ATTEMPTS = 5;
    private static final int ATTEMPT_WINDOW_MINUTES = 15;

    // -------------------------------------------------------
    // Email OTP
    // -------------------------------------------------------

    /**
     * Generate a dynamic OTP and deliver it via the user's registered email.
     * Enforces rate limiting (max 5 requests per 15-minute window).
     */
    public void generateAndSendOtp(User user, String purpose) {
        enforceRateLimit(user.getEmail());

        String otp = generateOtp();

        // Store in Redis with TTL
        String otpKey = OTP_PREFIX + user.getEmail();
        redisTemplate.opsForValue().set(otpKey, otp, Duration.ofMinutes(OTP_VALIDITY_MINUTES));

        try {
            emailService.sendOtpEmail(user.getEmail(), otp, purpose, OTP_VALIDITY_MINUTES);
            log.info("Email OTP dispatched to user: {}", user.getEmail());
        } catch (Exception e) {
            log.error("Failed to send OTP email to: {}", user.getEmail(), e);
            redisTemplate.delete(otpKey);
            throw new RuntimeException("Failed to send OTP. Please try again.");
        }
    }

    /**
     * Generate a dynamic OTP and deliver it via SMS to the user's registered phone number.
     * Enforces rate limiting.
     */
    public void generateAndSendSmsOtp(User user, String purpose) {
        if (user.getPhoneNumber() == null || user.getPhoneNumber().isBlank()) {
            throw new IllegalArgumentException("No phone number registered for this account!");
        }
        enforceRateLimit(user.getEmail());

        String otp = generateOtp();

        // Store in Redis under email-keyed SMS namespace
        String otpKey = "sms_otp:" + user.getEmail();
        redisTemplate.opsForValue().set(otpKey, otp, Duration.ofMinutes(OTP_VALIDITY_MINUTES));

        try {
            smsOtpService.sendSmsOtpToPhone(user.getPhoneNumber(), user.getEmail(), otp, purpose);
            log.info("SMS OTP dispatched to user: {}", user.getEmail());
        } catch (Exception e) {
            log.error("Failed to send SMS OTP to: {}", user.getEmail(), e);
            redisTemplate.delete(otpKey);
            throw new RuntimeException("Failed to send SMS OTP. Please try again.");
        }
    }

    /**
     * Generate and send OTP via the selected channel (EMAIL or SMS).
     */
    public void generateAndSendOtpToChannel(User user, String purpose, String channel) {
        if ("SMS".equalsIgnoreCase(channel)) {
            generateAndSendSmsOtp(user, purpose);
        } else {
            generateAndSendOtp(user, purpose);
        }
    }

    // -------------------------------------------------------
    // OTP Verification
    // -------------------------------------------------------

    /**
     * Verify OTP for the given email using the specified channel.
     * Returns true and deletes the OTP key if valid.
     */
    public boolean verifyOtp(String email, String otp, String channel) {
        String otpKey = "SMS".equalsIgnoreCase(channel) ? "sms_otp:" + email : OTP_PREFIX + email;
        return verifyKey(otpKey, email, otp);
    }

    /**
     * Verify OTP via email channel (default, backward compatible).
     */
    public boolean verifyOtp(String email, String otp) {
        return verifyOtp(email, otp, "EMAIL");
    }

    /**
     * Verify OTP — tries EMAIL channel first, then SMS channel as fallback.
     * Useful when the caller doesn't track which channel was used.
     */
    public boolean verifyOtpAnyChannel(String email, String otp) {
        if (verifyOtp(email, otp, "EMAIL")) return true;
        return verifyOtp(email, otp, "SMS");
    }

    /**
     * Clear OTP for a user (after successful authentication).
     */
    public void clearOtp(String email) {
        redisTemplate.delete(OTP_PREFIX + email);
        redisTemplate.delete("sms_otp:" + email);
        log.debug("OTP cleared for user: {}", email);
    }

    /**
     * Check if a valid OTP exists for the user in either channel.
     */
    public boolean hasValidOtp(String email) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(OTP_PREFIX + email))
                || Boolean.TRUE.equals(redisTemplate.hasKey("sms_otp:" + email));
    }

    // -------------------------------------------------------
    // Private Helpers
    // -------------------------------------------------------

    private boolean verifyKey(String otpKey, String email, String otp) {
        String storedOtp = redisTemplate.opsForValue().get(otpKey);
        if (storedOtp == null) {
            log.warn("OTP not found or expired for: {}", email);
            return false;
        }
        boolean valid = storedOtp.equals(otp);
        if (valid) {
            redisTemplate.delete(otpKey);
            log.info("OTP verified successfully for: {}", email);
        } else {
            log.warn("Invalid OTP attempt for: {}", email);
        }
        return valid;
    }

    private void enforceRateLimit(String email) {
        String attemptKey = OTP_ATTEMPT_PREFIX + email;
        Long attempts = redisTemplate.opsForValue().increment(attemptKey);
        if (attempts != null && attempts > MAX_ATTEMPTS) {
            log.warn("OTP rate limit exceeded for: {}", email);
            throw new IllegalArgumentException(
                "Too many OTP requests. Please try again after " + ATTEMPT_WINDOW_MINUTES + " minutes."
            );
        }
        if (attempts != null && attempts == 1) {
            redisTemplate.expire(attemptKey, Duration.ofMinutes(ATTEMPT_WINDOW_MINUTES));
        }
    }

    public String generateOtp() {
        SecureRandom random = new SecureRandom();
        int otpValue = random.nextInt((int) Math.pow(10, OTP_LENGTH));
        return String.format("%0" + OTP_LENGTH + "d", otpValue);
    }
}
