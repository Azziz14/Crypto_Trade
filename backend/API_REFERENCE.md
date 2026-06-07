# Backend API Quick Reference

## Authentication Endpoints

### 1. Register New User
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "phoneNumber": "+1234567890",
  "startingBalance": 1000000.00000000
}

Response 200:
{
  "message": "User registered successfully!",
  "email": "user@example.com",
  "startingBalance": 1000000.00000000,
  "qrCodeUri": "data:image/png;base64,..."
}
```

### 2. Request OTP (Dynamic Login)
```
POST /api/auth/login/request-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response 200:
{
  "message": "OTP sent to your email!",
  "email": "user@example.com"
}

Error 401:
{
  "error": "Unauthorized",
  "message": "Invalid email or password!",
  "status": 401,
  "timestamp": "2024-05-22T14:35:00"
}
```

### 3. Verify OTP
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

Error 400:
{
  "error": "Bad Request",
  "message": "Invalid OTP! Please try again.",
  "status": 400,
  "timestamp": "2024-05-22T14:35:00"
}
```

### 4. Login (Legacy TOTP flow - still supported)
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response 200:
{
  "email": "user@example.com",
  "mfaRequired": true
}
```

### 5. Refresh Token
```
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
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

### 6. Forgot Password
```
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com",
  "channel": "EMAIL"  // or "SMS"
}

Response 200:
{
  "message": "Verification code sent successfully!"
}
```

### 7. Reset Password
```
POST /api/auth/reset-password
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456",
  "newPassword": "NewSecurePass123!"
}

Response 200:
{
  "message": "Password reset successfully!"
}
```

---

## OAuth2 Endpoints

### 1. Google Login
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

Error 401:
{
  "error": "Invalid Google token signature",
  "status": 401
}
```

### 2. Verify Google Token (Testing)
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

---

## Response Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Login successful, token issued |
| 400 | Bad Request | Invalid input, validation failed |
| 401 | Unauthorized | Invalid credentials, token expired |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Unexpected error |

---

## Error Response Format

```json
{
  "error": "Error Type",
  "message": "Descriptive error message",
  "status": 400,
  "timestamp": "2024-05-22T14:35:00",
  "path": "/api/endpoint",
  "violations": {
    "field1": "Error for field1",
    "field2": "Error for field2"
  }
}
```

---

## Using Access Tokens

Include token in Authorization header:

```
GET /api/user/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Rate Limiting

**Headers returned with rate limit info**:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1716378000
```

**When limit exceeded (429)**:
```json
{
  "error": "Too many requests. Please try again later.",
  "status": 429
}
```

---

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| Invalid email or password! | Wrong credentials | Check email/password |
| Invalid OTP! Please try again. | Wrong or expired code | Request new OTP |
| OTP not found or expired | Took too long | Request new OTP |
| Too many OTP requests | Rate limit | Wait 15 minutes |
| Invalid Google token signature | Tampered token | Verify token with Google |
| Token audience mismatch | Wrong Client ID | Check OAuth config |
| Email address is already in use! | Duplicate registration | Use login instead |

---

## Testing Commands

### Test OTP Flow
```bash
# Request OTP
curl -X POST http://localhost:8080/api/auth/login/request-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Verify OTP (check console for code in dev mode)
curl -X POST http://localhost:8080/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456"
  }'
```

### Use Access Token
```bash
curl -X GET http://localhost:8080/api/some-protected-endpoint \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Test Rate Limiting
```bash
# This will trigger rate limit
for i in {1..15}; do
  curl -X POST http://localhost:8080/api/auth/login/request-otp \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"pass"}'
done
```

---

## Configuration for Production

1. **Update application.properties**:
```properties
app.mail.enabled=true
spring.mail.username=your-email@gmail.com
spring.mail.password=app-specific-password
spring.security.oauth2.client.registration.google.client-id=YOUR_CLIENT_ID
spring.security.oauth2.client.registration.google.client-secret=YOUR_SECRET
```

2. **Secure your secrets**:
   - Use environment variables
   - Store in vault (HashiCorp Vault, AWS Secrets Manager)
   - Never commit secrets to git

3. **Enable HTTPS**:
   - Get SSL certificate
   - Configure server.ssl.* properties
   - Redirect HTTP to HTTPS

4. **Set up Redis**:
   - Configure Redis host/port
   - Enable persistence
   - Set maxmemory policy

---

## Next Steps

1. Read [AUTHENTICATION.md](AUTHENTICATION.md) for detailed setup
2. Configure Google OAuth2 credentials
3. Set up email server (if not using console mode)
4. Test all flows locally
5. Deploy to production with security checklist

---

**Last Updated**: May 22, 2024  
**Version**: 1.0
