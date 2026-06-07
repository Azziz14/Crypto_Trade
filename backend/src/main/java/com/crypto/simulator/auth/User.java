package com.crypto.simulator.auth;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "users", indexes = {
    @Index(name = "idx_user_email", columnList = "email", unique = true),
    @Index(name = "idx_firebase_uid", columnList = "firebase_uid")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Firebase Authentication UID (optional — null for email+password only users).
     */
    @Column(name = "firebase_uid", length = 191)
    private String firebaseUid;

    @Column(nullable = false, unique = true, length = 191)
    private String email;

    /**
     * Bcrypt-hashed password (may be null if user registered via Firebase OAuth).
     */
    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    /**
     * Controls whether Email OTP is active for this user (default: true).
     */
    @Builder.Default
    @Column(name = "otp_enabled_email", nullable = false)
    private boolean otpEnabledEmail = true;

    /**
     * Controls whether SMS OTP is active for this user (default: false — enabled at user request).
     */
    @Builder.Default
    @Column(name = "otp_enabled_sms", nullable = false)
    private boolean otpEnabledSms = false;

    /**
     * Stores the active dynamic OTP code for password reset flows (non-Redis fallback).
     * For login OTPs, Redis is used exclusively.
     */
    @Column(name = "otp_code", length = 10)
    private String otpCode;

    /**
     * Expiry timestamp for the stored otpCode field.
     */
    @Column(name = "otp_expiry")
    private LocalDateTime otpExpiry;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Column(name = "virtual_balance", nullable = false, precision = 18, scale = 8)
    private BigDecimal virtualBalance;

    @Column(name = "initial_balance", nullable = false, precision = 18, scale = 8)
    private BigDecimal initialBalance;

    @Builder.Default
    @Column(name = "account_verified", nullable = false)
    private boolean accountVerified = false;

    @Column(name = "last_login")
    private LocalDateTime lastLogin;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
