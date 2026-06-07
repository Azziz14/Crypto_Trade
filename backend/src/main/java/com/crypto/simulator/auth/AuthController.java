package com.crypto.simulator.auth;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.HashMap;
import java.util.Map;

/**
 * REST controller for all authentication endpoints.
 *
 * Public endpoints (no JWT required):
 *   POST /api/auth/register                — email+password+phone registration
 *   POST /api/auth/login/request-otp       — step 1: verify password, send email OTP
 *   POST /api/auth/login/request-sms-otp   — step 1 variant: send SMS OTP instead
 *   POST /api/auth/verify-otp              — step 2: verify OTP, receive JWT
 *   POST /api/auth/refresh                 — rotate refresh token
 *   POST /api/auth/forgot-password         — send password-reset OTP (email or SMS)
 *   POST /api/auth/reset-password          — verify OTP + set new password
 *
 *   POST /api/auth/firebase/register       — register user via Firebase Auth
 *   POST /api/auth/firebase/login          — verify Firebase ID token, receive JWT
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin
@Slf4j
public class AuthController {

    private final UserService userService;
    private final OtpService otpService;
    private final SmsOtpService smsOtpService;
    private final FirebaseAuthService firebaseAuthService;

    // -------------------------------------------------------
    // Registration
    // -------------------------------------------------------

    /**
     * Register a new user with email, password and phone number.
     * No QR code / TOTP — dynamic OTP will be used for MFA.
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        try {
            User registered = userService.registerUser(request);
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Registration successful! Please sign in with your credentials.");
            response.put("email", registered.getEmail());
            response.put("startingBalance", registered.getInitialBalance());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return badRequest(e.getMessage());
        } catch (Exception e) {
            log.error("Registration error", e);
            return serverError("Registration failed. Please try again.");
        }
    }

    // -------------------------------------------------------
    // Login — Step 1: Dispatch OTP
    // -------------------------------------------------------

    /**
     * Step 1 of login: verify password → send dynamic 6-digit OTP to registered email.
     * Frontend should show the OTP input screen after receiving 200.
     */
    @PostMapping("/login/request-otp")
    public ResponseEntity<?> requestLoginOtp(@Valid @RequestBody LoginRequest request) {
        try {
            userService.initiateLoginWithOtp(request);
            Map<String, String> response = new HashMap<>();
            response.put("message", "A 6-digit OTP has been sent to your registered email.");
            response.put("email", request.getEmail());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.warn("Login OTP request failed: {}", e.getMessage());
            return badRequest(e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error during login OTP dispatch", e);
            return serverError("Failed to send OTP. Please try again.");
        }
    }

    /**
     * Step 1 variant: verify password → send dynamic OTP via SMS to registered mobile number.
     */
    @PostMapping("/login/request-sms-otp")
    public ResponseEntity<?> requestLoginSmsOtp(@Valid @RequestBody LoginRequest request) {
        try {
            userService.initiateLoginWithSmsOtp(request);
            Map<String, String> response = new HashMap<>();
            response.put("message", "A 6-digit OTP has been sent to your registered mobile number.");
            response.put("email", request.getEmail());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.warn("Login SMS OTP request failed: {}", e.getMessage());
            return badRequest(e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error during login SMS OTP dispatch", e);
            return serverError("Failed to send SMS OTP. Please try again.");
        }
    }

    // -------------------------------------------------------
    // Login — Step 2: Verify OTP → Issue JWT
    // -------------------------------------------------------

    /**
     * Step 2 of login: verify the dynamic OTP (email or SMS).
     * Returns JWT access + refresh tokens on success.
     */
    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody VerifyOtpRequest request) {
        try {
            AuthResponse authResponse = userService.verifyOtp(request);
            return ResponseEntity.ok(authResponse);
        } catch (IllegalArgumentException e) {
            return badRequest(e.getMessage());
        } catch (Exception e) {
            log.error("OTP verification error", e);
            return serverError("Verification failed. Please try again.");
        }
    }

    // -------------------------------------------------------
    // JWT Token Refresh
    // -------------------------------------------------------

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody RefreshTokenRequest request) {
        try {
            AuthResponse authResponse = userService.refreshUserToken(request);
            return ResponseEntity.ok(authResponse);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
        }
    }

    // -------------------------------------------------------
    // Forgot / Reset Password
    // -------------------------------------------------------

    /**
     * Request a password-reset OTP.
     * Body: { "email": "...", "channel": "EMAIL" | "SMS" }
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        try {
            userService.forgotPassword(request);
            return ResponseEntity.ok(Map.of("message",
                "Verification code sent! Check your " +
                ("SMS".equalsIgnoreCase(request.getChannel()) ? "mobile number." : "email inbox.")));
        } catch (IllegalArgumentException e) {
            return badRequest(e.getMessage());
        } catch (Exception e) {
            log.error("Forgot-password error", e);
            return serverError("Failed to send verification code.");
        }
    }

    /**
     * Reset password using the OTP received via email or SMS.
     * Body: { "email": "...", "code": "123456", "newPassword": "..." }
     */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest request) {
        try {
            userService.resetPassword(request);
            return ResponseEntity.ok(Map.of("message", "Password reset successfully!"));
        } catch (IllegalArgumentException e) {
            return badRequest(e.getMessage());
        } catch (Exception e) {
            log.error("Reset-password error", e);
            return serverError("Failed to reset password.");
        }
    }

    // -------------------------------------------------------
    // Firebase Authentication Endpoints
    // -------------------------------------------------------

    /**
     * Register a user and simultaneously create the account in Firebase Authentication.
     */
    @PostMapping("/firebase/register")
    public ResponseEntity<?> firebaseRegister(@Valid @RequestBody RegisterRequest request) {
        try {
            User registered = userService.firebaseRegisterUser(request, firebaseAuthService);
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Firebase account created successfully!");
            response.put("email", registered.getEmail());
            response.put("startingBalance", registered.getInitialBalance());
            response.put("firebaseUid", registered.getFirebaseUid());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return badRequest(e.getMessage());
        } catch (Exception e) {
            log.error("Firebase registration failed", e);
            return serverError("Firebase registration failed: " + e.getMessage());
        }
    }

    /**
     * Log in using a Firebase ID token obtained from the frontend Firebase SDK.
     * Body: { "idToken": "<firebase-id-token>" }
     * Returns our own JWT on success.
     */
    @PostMapping("/firebase/login")
    public ResponseEntity<?> firebaseLogin(@RequestBody Map<String, String> body) {
        try {
            String idToken = body.get("idToken");
            if (idToken == null || idToken.isBlank()) {
                return badRequest("Firebase ID token is required.");
            }
            AuthResponse authResponse = userService.firebaseAuthenticate(idToken, firebaseAuthService);
            return ResponseEntity.ok(authResponse);
        } catch (IllegalArgumentException e) {
            log.warn("Firebase login rejected: {}", e.getMessage());
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            log.warn("Firebase not configured: {}", e.getMessage());
            return ResponseEntity.status(503).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Firebase login error", e);
            return serverError("Firebase authentication failed.");
        }
    }

    // -------------------------------------------------------
    // Private response helpers
    // -------------------------------------------------------

    private ResponseEntity<Map<String, String>> badRequest(String message) {
        return ResponseEntity.badRequest().body(Map.of("error", message));
    }

    private ResponseEntity<Map<String, String>> serverError(String message) {
        return ResponseEntity.status(500).body(Map.of("error", message));
    }
}
