package com.crypto.simulator.auth;

import com.google.firebase.auth.FirebaseToken;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Core user management and authentication service.
 *
 * Authentication flow (email + dynamic OTP — no TOTP / QR codes):
 *
 *  REGISTER  → Email + Password + Phone  → user saved  → welcome email queued
 *  LOGIN     → Email + Password verified → dynamic OTP sent to email (or SMS)
 *            → /verify-otp              → JWT issued
 *  FORGOT PW → Email + channel choice   → dynamic OTP sent to chosen channel
 *            → /reset-password          → password updated
 *
 *  FIREBASE  → Frontend obtains Firebase ID token → /firebase/login
 *            → Token verified server-side          → JWT issued
 */
@Service
@Transactional
@Slf4j
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final OtpService otpService;
    private final EmailService emailService;

    @Value("${app.starting-balance}")
    private BigDecimal defaultStartingBalance;

    // -------------------------------------------------------
    // Registration
    // -------------------------------------------------------

    /**
     * Register a new user with email + password + phone (dynamic OTP auth — no TOTP).
     *
     * @return the saved User entity
     */
    public User registerUser(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email address is already in use!");
        }
        if (request.getPhoneNumber() == null || request.getPhoneNumber().trim().isEmpty()) {
            throw new IllegalArgumentException("Phone number is required!");
        }

        BigDecimal balance = request.getStartingBalance() != null
                ? request.getStartingBalance()
                : defaultStartingBalance;

        // admin@crypto.com automatically gets ADMIN role
        Role role = request.getEmail().equalsIgnoreCase("admin@crypto.com") ? Role.ADMIN : Role.USER;

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .phoneNumber(request.getPhoneNumber().trim())
                .role(role)
                .virtualBalance(balance)
                .initialBalance(balance)
                .otpEnabledEmail(true)
                .otpEnabledSms(false)
                .accountVerified(false)
                .createdAt(LocalDateTime.now())
                .build();

        User saved = userRepository.save(user);

        // Send async welcome email (non-blocking — swallow errors)
        try {
            emailService.sendWelcomeEmail(saved.getEmail(), saved.getEmail());
        } catch (Exception e) {
            log.warn("Welcome email could not be sent to {}: {}", saved.getEmail(), e.getMessage());
        }

        log.info("User registered successfully: {}", saved.getEmail());
        return saved;
    }

    /**
     * Register a user backed by Firebase Authentication.
     * Creates the Firebase user record first, then mirrors the user locally.
     */
    public User firebaseRegisterUser(RegisterRequest request, FirebaseAuthService firebaseAuthService) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email address is already in use!");
        }
        if (request.getPhoneNumber() == null || request.getPhoneNumber().trim().isEmpty()) {
            throw new IllegalArgumentException("Phone number is required for Firebase registration!");
        }

        String firebaseUid;
        try {
            var firebaseUser = firebaseAuthService.createUser(
                    request.getEmail(), request.getPassword(), request.getEmail());
            firebaseUid = firebaseUser.getUid();
        } catch (Exception e) {
            log.error("Firebase user creation failed for {}: {}", request.getEmail(), e.getMessage());
            throw new RuntimeException("Firebase registration failed: " + e.getMessage(), e);
        }

        BigDecimal balance = request.getStartingBalance() != null
                ? request.getStartingBalance()
                : defaultStartingBalance;

        Role role = request.getEmail().equalsIgnoreCase("admin@crypto.com") ? Role.ADMIN : Role.USER;

        User user = User.builder()
                .firebaseUid(firebaseUid)
                .email(request.getEmail())
                .phoneNumber(request.getPhoneNumber().trim())
                .role(role)
                .virtualBalance(balance)
                .initialBalance(balance)
                .otpEnabledEmail(true)
                .otpEnabledSms(false)
                .accountVerified(true)   // Firebase handles email verification
                .createdAt(LocalDateTime.now())
                .build();

        User saved = userRepository.save(user);

        try { emailService.sendWelcomeEmail(saved.getEmail(), saved.getEmail()); }
        catch (Exception e) { log.warn("Welcome email failed for {}", saved.getEmail()); }

        log.info("Firebase user registered: uid={}", firebaseUid);
        return saved;
    }

    // -------------------------------------------------------
    // Login — Step 1: Verify password, dispatch dynamic OTP
    // -------------------------------------------------------

    /**
     * Step 1 of login: verify password, then dispatch a dynamic OTP to the user's email.
     * The frontend should show the OTP input screen after this returns successfully.
     *
     * @param request LoginRequest containing email + password
     */
    public void initiateLoginWithOtp(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password!"));

        if (request.getPassword() == null || request.getPassword().isBlank()) {
            throw new IllegalArgumentException("Password is required!");
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password!");
        }

        // Send dynamic OTP to user's email
        otpService.generateAndSendOtp(user, "Login");
        log.info("Login OTP dispatched to: {}", user.getEmail());
    }

    /**
     * Step 1 of login (SMS variant): verify password, then send OTP via SMS.
     */
    public void initiateLoginWithSmsOtp(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password!"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password!");
        }

        otpService.generateAndSendSmsOtp(user, "Login");
        log.info("Login SMS OTP dispatched to: {}", user.getEmail());
    }

    // -------------------------------------------------------
    // Login — Step 2: Verify OTP, issue JWT
    // -------------------------------------------------------

    /**
     * Step 2 of login: verify the dynamic OTP (email or SMS channel) and issue JWT tokens.
     *
     * @param request VerifyOtpRequest containing email + 6-digit OTP code
     * @return AuthResponse with JWT access/refresh tokens
     */
    public AuthResponse verifyLoginOtp(VerifyOtpRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("User not found!"));

        // Try email OTP first, then SMS OTP as fallback
        boolean valid = otpService.verifyOtpAnyChannel(user.getEmail(), request.getCode());

        if (!valid) {
            log.warn("Invalid OTP submitted by: {}", user.getEmail());
            throw new IllegalArgumentException("Invalid or expired OTP! Please try again.");
        }

        user.setLastLogin(LocalDateTime.now());
        user.setAccountVerified(true);
        userRepository.save(user);

        String accessToken  = jwtTokenProvider.generateToken(user.getEmail(), user.getRole().name());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getEmail());

        log.info("User authenticated successfully: {}", user.getEmail());
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .email(user.getEmail())
                .role(user.getRole().name())
                .virtualBalance(user.getVirtualBalance())
                .initialBalance(user.getInitialBalance())
                .mfaRequired(false)
                .build();
    }

    /** Alias kept for backward-compatible controller calls. */
    public AuthResponse verifyOtp(VerifyOtpRequest request) {
        return verifyLoginOtp(request);
    }

    // -------------------------------------------------------
    // Firebase Login — verify ID token, issue JWT
    // -------------------------------------------------------

    /**
     * Authenticate via Firebase ID token.
     * The frontend completes Firebase sign-in and sends us the ID token.
     * We verify it server-side with Firebase Admin SDK, then issue our own JWT.
     */
    public AuthResponse firebaseAuthenticate(String idToken, FirebaseAuthService firebaseAuthService) {
        if (!firebaseAuthService.isInitialized()) {
            throw new IllegalStateException(
                "Firebase authentication is not configured. " +
                "Please add firebase-config.json to the backend root and restart."
            );
        }

        FirebaseToken decoded = firebaseAuthService.verifyIdToken(idToken);
        String email = decoded.getEmail();
        String uid   = decoded.getUid();

        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Firebase token does not contain a valid email.");
        }

        // Find or auto-provision local user record
        User user = userRepository.findByEmail(email).orElseGet(() -> {
            log.info("Auto-provisioning local record for Firebase user: {}", email);
            Role role = email.equalsIgnoreCase("admin@crypto.com") ? Role.ADMIN : Role.USER;
            return userRepository.save(User.builder()
                    .firebaseUid(uid)
                    .email(email)
                    .role(role)
                    .virtualBalance(defaultStartingBalance)
                    .initialBalance(defaultStartingBalance)
                    .accountVerified(true)
                    .createdAt(LocalDateTime.now())
                    .build());
        });

        // Sync Firebase UID if not already set
        if (user.getFirebaseUid() == null) {
            user.setFirebaseUid(uid);
        }

        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        String accessToken  = jwtTokenProvider.generateToken(user.getEmail(), user.getRole().name());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getEmail());

        log.info("Firebase user authenticated: {}", email);
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .email(user.getEmail())
                .role(user.getRole().name())
                .virtualBalance(user.getVirtualBalance())
                .initialBalance(user.getInitialBalance())
                .mfaRequired(false)
                .build();
    }

    // -------------------------------------------------------
    // Token Refresh
    // -------------------------------------------------------

    public AuthResponse refreshUserToken(RefreshTokenRequest request) {
        String token = request.getRefreshToken();
        if (!jwtTokenProvider.validateToken(token)) {
            throw new IllegalArgumentException("Invalid or expired refresh token!");
        }
        String email = jwtTokenProvider.getEmailFromToken(token);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found!"));

        String newAccess  = jwtTokenProvider.generateToken(user.getEmail(), user.getRole().name());
        String newRefresh = jwtTokenProvider.generateRefreshToken(user.getEmail());

        return AuthResponse.builder()
                .accessToken(newAccess)
                .refreshToken(newRefresh)
                .email(user.getEmail())
                .role(user.getRole().name())
                .virtualBalance(user.getVirtualBalance())
                .initialBalance(user.getInitialBalance())
                .mfaRequired(false)
                .build();
    }

    // -------------------------------------------------------
    // Forgot / Reset Password
    // -------------------------------------------------------

    /**
     * Generate a dynamic OTP and deliver it via the chosen channel (EMAIL or SMS).
     * The OTP is stored both in Redis (via OtpService) and on the User entity
     * (DB fallback) to survive Redis restarts.
     */
    public void forgotPassword(ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("No account found with that email!"));

        String channel = request.getChannel() != null ? request.getChannel().toUpperCase() : "EMAIL";

        // Generate OTP via service (handles Redis + delivery)
        otpService.generateAndSendOtpToChannel(user, "Password Reset", channel);

        // Also persist as DB-level fallback (survives Redis flush)
        String otp = otpService.generateOtp();
        user.setOtpCode(otp);
        user.setOtpExpiry(LocalDateTime.now().plusMinutes(5));
        userRepository.save(user);

        log.info("Password reset OTP dispatched via {} to: {}", channel, user.getEmail());
    }

    /**
     * Validate the dynamic OTP and reset the user's password.
     */
    public void resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("User not found!"));

        // Prefer Redis OTP verification; fall back to DB-stored OTP
        boolean valid = otpService.verifyOtpAnyChannel(user.getEmail(), request.getCode());

        if (!valid) {
            // DB fallback check
            if (user.getOtpCode() == null || user.getOtpExpiry() == null) {
                throw new IllegalArgumentException("No active reset request found. Please request a new code.");
            }
            if (user.getOtpExpiry().isBefore(LocalDateTime.now())) {
                throw new IllegalArgumentException("Verification code has expired! Please request a new code.");
            }
            if (!user.getOtpCode().equals(request.getCode())) {
                throw new IllegalArgumentException("Invalid verification code! Please try again.");
            }
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setOtpCode(null);
        user.setOtpExpiry(null);
        userRepository.save(user);

        log.info("Password reset successfully for: {}", user.getEmail());

        try { emailService.sendPasswordResetConfirmation(user.getEmail()); }
        catch (Exception e) { log.warn("Reset confirmation email failed for {}", user.getEmail()); }
    }

    // -------------------------------------------------------
    // Utility
    // -------------------------------------------------------

    @Transactional(readOnly = true)
    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));
    }

    /**
     * Verify SMS OTP for login (called from AuthController /login/verify-sms-otp).
     */
    public AuthResponse verifySmsLoginOtp(String email, String otp) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found!"));

        boolean valid = otpService.verifyOtp(user.getEmail(), otp, "SMS");
        if (!valid) {
            throw new IllegalArgumentException("Invalid or expired SMS OTP! Please try again.");
        }

        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        String accessToken  = jwtTokenProvider.generateToken(user.getEmail(), user.getRole().name());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getEmail());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .email(user.getEmail())
                .role(user.getRole().name())
                .virtualBalance(user.getVirtualBalance())
                .initialBalance(user.getInitialBalance())
                .mfaRequired(false)
                .build();
    }
}
