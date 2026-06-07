# Authentication System Documentation

## Overview

This backend has been enhanced with enterprise-grade authentication features including:

1. **Dynamic OTP (One-Time Password)** - Generated on every login
2. **Google OAuth2 Authentication** - Social login integration
3. **Enhanced Security** - Rate limiting, audit logging, and security headers
4. **Professional Error Handling** - Standardized error responses
5. **Email Notifications** - OTP delivery and welcome emails

## 1. Dynamic OTP Authentication

### How It Works

When a user attempts to login with their email and password:

1. **User provides credentials** → POST `/api/auth/login/request-otp`
   - System verifies the email/password combination
   - Generates a 6-digit OTP
   - Sends OTP via email (5-minute validity)
   - Returns success response

2. **User receives OTP** → Email with 6-digit code

3. **User verifies OTP** → POST `/api/auth/verify-otp`
   - Sends email and OTP code
   - System validates the code
   - Issues JWT access and refresh tokens
   - Updates last login timestamp

### API Endpoints

#### 1. Request Login OTP
```
POST /api/auth/login/request-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}

Response 200:
{
  "message": "OTP sent to your email!",
  "email": "user@example.com"
}
```

#### 2. Verify OTP and Get Tokens
```
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456"
}

Response 200:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "email": "user@example.com",
  "role": "USER",
  "virtualBalance": 1000000.00000000,
  "initialBalance": 1000000.00000000,
  "mfaRequired": false
}
```

### Security Features

- **Rate Limiting**: Max 10 OTP requests per 15 minutes per email
- **Expiration**: OTP valid for 5 minutes only
- **Redis Storage**: OTPs stored in Redis (auto-cleanup on expiry)
- **Email Verification**: OTP sent via email (simulated in dev mode)

---

## 2. Google OAuth2 Authentication

### Setup

Before using Google OAuth2, you need to register your application:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth2 credentials (Web application)
5. Get your Client ID and Client Secret
6. Update `application.properties`:

```properties
spring.security.oauth2.client.registration.google.client-id=YOUR_GOOGLE_CLIENT_ID
spring.security.oauth2.client.registration.google.client-secret=YOUR_GOOGLE_CLIENT_SECRET
```

### How It Works

1. **Frontend implements Google Sign-In button**
   - User clicks "Sign in with Google"
   - Google Sign-In flow opens
   - User authenticates with Google

2. **Frontend sends ID token to backend** → POST `/api/oauth/google/login`
   - System verifies Google ID token signature
   - Extracts user email and profile info
   - Creates or links user account
   - Returns JWT tokens

3. **User is authenticated**
   - Can access trading endpoints immediately
   - No additional MFA required (Google verified email)

### API Endpoints

#### 1. Google Login
```
POST /api/oauth/google/login
Content-Type: application/json

{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjI4YTQyN...",
  "accessToken": "ya29.a0AfH6SMBx..."  // Optional
}

Response 200:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "email": "user@gmail.com",
  "role": "USER",
  "virtualBalance": 1000000.00000000,
  "initialBalance": 1000000.00000000,
  "provider": "GOOGLE",
  "newUser": false,
  "mfaRequired": false
}
```

#### 2. Verify Token (Testing)
```
POST /api/oauth/verify-token
Content-Type: application/json

{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjI4YTQyN..."
}

Response 200:
{
  "email": "user@gmail.com",
  "name": "User Full Name",
  "provider": "GOOGLE"
}
```

### User Account Handling

**New User via Google:**
- Account auto-created with starting balance
- Email marked as verified
- Welcome email sent
- `newUser` flag set to true

**Existing User:**
- Google provider linked to account
- OAuth provider ID stored
- Last login timestamp updated
- `newUser` flag set to false

---

## 3. Backend Improvements

### A. Rate Limiting

Implemented to prevent brute force attacks:

- **Login endpoints**: 10 requests per minute per IP
- **Other endpoints**: 60 requests per minute per IP
- Uses token bucket algorithm via Bucket4j
- Supports X-Forwarded-For and X-Real-IP headers for proxied requests

### B. Audit Logging

Security-critical events are logged:

- User registration attempts
- Login OTP requests
- Successful/failed authentications
- OAuth login events
- Password reset operations

Example logs:
```
[AUDIT] User registration attempt at 2024-05-22 14:30:45
[AUDIT] Login OTP requested at 2024-05-22 14:31:10
[AUDIT] User successfully logged in via OTP at 2024-05-22 14:31:25
[RATE_LIMIT] Rate limit exceeded for IP: 192.168.1.100 on path: /api/auth/login/request-otp
```

### C. Security Headers

Enhanced HTTP security headers:

- **Content-Security-Policy**: Prevents XSS attacks
- **X-XSS-Protection**: XSS protection mode blocking
- **X-Content-Type-Options**: Prevents MIME sniffing
- **HSTS**: (Can be enabled in production)

### D. Error Handling

Standardized error responses across all endpoints:

```json
{
  "error": "Bad Request",
  "message": "Invalid email or password!",
  "status": 400,
  "timestamp": "2024-05-22T14:35:00",
  "path": "/api/auth/login/request-otp"
}
```

Validation errors include field-level details:

```json
{
  "error": "Validation Error",
  "message": "Invalid input data",
  "status": 400,
  "timestamp": "2024-05-22T14:35:00",
  "path": "/api/auth/register",
  "violations": {
    "email": "Email should be valid",
    "password": "Password must be at least 8 characters"
  }
}
```

### E. Email Service

Handles all transactional emails:

**Development Mode (enabled by default):**
- Emails printed to console for testing
- No actual SMTP connection required

**Production Mode:**
- Real email delivery via configured SMTP server
- Beautiful HTML templates
- Email templates for: OTP, welcome, password reset, OAuth notifications

To enable production email:
```properties
app.mail.enabled=true
spring.mail.host=smtp.gmail.com
spring.mail.username=your-email@gmail.com
spring.mail.password=your-app-password
```

---

## 4. Updated User Entity

The User entity now supports:

```java
// OAuth2 provider information
private String oauthProvider;      // "GOOGLE", "GITHUB", etc.
private String oauthProviderId;    // Provider's unique ID

// Additional security fields
private boolean accountVerified;   // Email verified
private LocalDateTime lastLogin;   // Track login attempts
```

---

## 5. Configuration

### application.properties Updates

```properties
# Email Configuration
app.mail.enabled=false
app.mail.from=noreply@antigravitytrade.com

# Mail Server (Gmail example)
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=your-email@gmail.com
spring.mail.password=your-app-specific-password

# Google OAuth2
spring.security.oauth2.client.registration.google.client-id=YOUR_CLIENT_ID
spring.security.oauth2.client.registration.google.client-secret=YOUR_SECRET
```

---

## 6. Frontend Integration

### Dynamic OTP Flow

```javascript
// Step 1: Request OTP
const response = await fetch('/api/auth/login/request-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

// Step 2: User enters OTP from email
const otpResponse = await fetch('/api/auth/verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, code: userOtpInput })
});

const { accessToken, refreshToken } = await otpResponse.json();
// Store tokens and redirect to dashboard
```

### Google OAuth2 Flow

```javascript
// Use Google Sign-In button
// When user clicks "Sign in with Google":

const response = await fetch('/api/oauth/google/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ idToken: googleIdToken })
});

const { accessToken, refreshToken, newUser } = await response.json();

if (newUser) {
  // Redirect to onboarding/profile setup
} else {
  // Redirect to dashboard
}
```

---

## 7. Best Practices & Security Notes

### DO's ✅
- Always store access tokens securely (HttpOnly cookies or secure storage)
- Refresh access tokens before expiry
- Validate email before granting access in OTP flow
- Use HTTPS in production
- Keep Client Secret secure (never expose in frontend)
- Implement CSRF protection for state-changing operations

### DON'Ts ❌
- Don't expose Client Secret in frontend code
- Don't send passwords over unencrypted connections
- Don't store OTPs in plain text (use Redis with TTL)
- Don't trust client-side validation alone
- Don't log sensitive data (passwords, tokens)

---

## 8. Troubleshooting

### OTP Not Received
1. Check `app.mail.enabled=false` logs in console
2. For real email, verify SMTP configuration
3. Check mail server credentials and app-specific password

### Google Login Fails
1. Verify Client ID in `application.properties`
2. Check token signature and expiry
3. Ensure redirect URI matches Google Cloud settings
4. Check browser console for CORS errors

### Rate Limit Errors
- Client will receive 429 Too Many Requests
- Wait before retrying
- Check X-RateLimit headers in response

---

## 9. Future Enhancements

- Two-factor authentication (2FA) with TOTP
- Support for additional OAuth providers (GitHub, Microsoft)
- Biometric authentication support
- Passwordless authentication
- Device trust/remember device
- Session management dashboard
- IP whitelist/blacklist

---

## Database Schema Updates

Run these migrations to support new features:

```sql
ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(50);
ALTER TABLE users ADD COLUMN oauth_provider_id VARCHAR(191);
ALTER TABLE users ADD COLUMN account_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN last_login DATETIME;
ALTER TABLE users MODIFY password_hash VARCHAR(255);  -- Make password nullable

CREATE INDEX idx_oauth_provider ON users(oauth_provider, oauth_provider_id);
```

---

## Support & Monitoring

Monitor these metrics in production:
- OTP generation rate (per user, per IP)
- Failed login attempts
- OAuth token verification failures
- Email delivery failures
- API error rates by endpoint

---

Last Updated: May 22, 2024
Version: 1.0
