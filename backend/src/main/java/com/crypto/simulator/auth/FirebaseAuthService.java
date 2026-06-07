package com.crypto.simulator.auth;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import com.google.firebase.auth.UserRecord;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Map;

/**
 * Service for Firebase Admin SDK operations.
 *
 * Handles:
 *  - Creating / updating / deleting Firebase users
 *  - Verifying Firebase ID tokens (for Firebase Auth-backed login)
 *  - Setting custom claims (roles)
 *
 * Initialisation: reads firebase-config.json from the path defined by
 * ${firebase.config.path} in application.properties.
 * If the file is not found, the service falls back to a no-op stub so the
 * application can still start in pure email+OTP mode (Firebase login endpoints
 * will return a 503 in that case).
 */
@Service
@Slf4j
public class FirebaseAuthService {

    private FirebaseAuth firebaseAuth;
    private boolean initialized = false;

    @Value("${firebase.config.path:firebase-config.json}")
    private String firebaseConfigPath;

    public FirebaseAuthService(@Value("${firebase.config.path:firebase-config.json}") String configPath) {
        try {
            if (FirebaseApp.getApps().isEmpty()) {
                InputStream serviceAccount = new FileInputStream(configPath);
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                        .build();
                FirebaseApp.initializeApp(options);
            }
            this.firebaseAuth = FirebaseAuth.getInstance();
            this.initialized = true;
            log.info("Firebase Admin SDK initialised successfully from: {}", configPath);
        } catch (IOException e) {
            log.warn("Firebase config file not found at '{}'. Firebase Auth endpoints will be disabled. " +
                     "Email+OTP login will continue to work normally.", configPath);
        }
    }

    // -------------------------------------------------------
    // Token Verification
    // -------------------------------------------------------

    /**
     * Verify a Firebase ID token sent from the frontend (after Firebase client-side sign-in).
     *
     * @param idToken the raw Firebase ID token string
     * @return FirebaseToken containing uid, email, claims, etc.
     * @throws IllegalArgumentException if the token is invalid / expired
     * @throws IllegalStateException    if Firebase SDK is not initialised
     */
    public FirebaseToken verifyIdToken(String idToken) {
        requireInitialized();
        try {
            FirebaseToken decoded = firebaseAuth.verifyIdToken(idToken);
            log.info("Firebase ID token verified for uid: {}", decoded.getUid());
            return decoded;
        } catch (FirebaseAuthException e) {
            log.warn("Firebase ID token verification failed: {}", e.getMessage());
            throw new IllegalArgumentException("Invalid or expired Firebase token: " + e.getMessage(), e);
        }
    }

    // -------------------------------------------------------
    // User Management
    // -------------------------------------------------------

    /** Create a new Firebase Authentication user. */
    public UserRecord createUser(String email, String password, String displayName) throws FirebaseAuthException {
        requireInitialized();
        UserRecord.CreateRequest request = new UserRecord.CreateRequest()
                .setEmail(email)
                .setPassword(password)
                .setDisplayName(displayName)
                .setEmailVerified(false)
                .setDisabled(false);
        UserRecord record = firebaseAuth.createUser(request);
        log.info("Firebase user created: {}", record.getUid());
        return record;
    }

    /** Retrieve Firebase user by email. */
    public UserRecord getUserByEmail(String email) throws FirebaseAuthException {
        requireInitialized();
        return firebaseAuth.getUserByEmail(email);
    }

    /** Retrieve Firebase user by UID. */
    public UserRecord getUserByUid(String uid) throws FirebaseAuthException {
        requireInitialized();
        return firebaseAuth.getUser(uid);
    }

    /** Update password in Firebase for the given UID. */
    public void updateUserPassword(String uid, String newPassword) throws FirebaseAuthException {
        requireInitialized();
        firebaseAuth.updateUser(new UserRecord.UpdateRequest(uid).setPassword(newPassword));
        log.info("Firebase password updated for uid: {}", uid);
    }

    /** Update display name and phone in Firebase. */
    public void updateUserProfile(String uid, String displayName, String phoneNumber) throws FirebaseAuthException {
        requireInitialized();
        firebaseAuth.updateUser(new UserRecord.UpdateRequest(uid)
                .setDisplayName(displayName)
                .setPhoneNumber(phoneNumber));
        log.info("Firebase profile updated for uid: {}", uid);
    }

    /** Set custom claims (e.g. role: ADMIN) for a Firebase user. */
    public void setCustomClaims(String uid, Map<String, Object> claims) throws FirebaseAuthException {
        requireInitialized();
        firebaseAuth.setCustomUserClaims(uid, claims);
        log.info("Firebase custom claims set for uid: {}", uid);
    }

    /** Disable a Firebase user account. */
    public void disableUser(String uid) throws FirebaseAuthException {
        requireInitialized();
        firebaseAuth.updateUser(new UserRecord.UpdateRequest(uid).setDisabled(true));
        log.info("Firebase user disabled: {}", uid);
    }

    /** Re-enable a Firebase user account. */
    public void enableUser(String uid) throws FirebaseAuthException {
        requireInitialized();
        firebaseAuth.updateUser(new UserRecord.UpdateRequest(uid).setDisabled(false));
        log.info("Firebase user enabled: {}", uid);
    }

    /** Delete a Firebase user account. */
    public void deleteUser(String uid) throws FirebaseAuthException {
        requireInitialized();
        firebaseAuth.deleteUser(uid);
        log.info("Firebase user deleted: {}", uid);
    }

    /** @return true if the Firebase Admin SDK was successfully initialised. */
    public boolean isInitialized() {
        return initialized;
    }

    // -------------------------------------------------------
    // Private Helpers
    // -------------------------------------------------------

    private void requireInitialized() {
        if (!initialized) {
            throw new IllegalStateException(
                "Firebase Admin SDK is not initialised. " +
                "Please place a valid firebase-config.json in the backend root directory."
            );
        }
    }
}
