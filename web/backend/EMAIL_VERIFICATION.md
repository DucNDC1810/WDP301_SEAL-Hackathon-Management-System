# Email Verification Feature Documentation

## Overview

This implementation adds email verification functionality where:

- **Admin** sends verification codes to user emails
- **Contestant** enters the code to verify their email address

## Database Schema Changes

### Updated `users` Collection

Added two new fields to the User model:

```javascript
{
  // ... existing fields
  is_verified: Boolean,                      // true/false
  verification_code: String,                 // 6-digit code or null
  verification_code_expires_at: Date,        // Expiration time or null
  // ... other fields
}
```

## API Endpoints

### 1. Admin Sends Verification Code

**Endpoint:** `POST /api/auth/send-verification-code`

**Request Body:**

```json
{
  "user_id": "507f1f77bcf86cd799439011"
}
```

**Response (Success - 200):**

```json
{
  "success": true,
  "message": "Mã xác thực đã được gửi tới email của user"
}
```

**Response (Error - 400):**

```json
{
  "success": false,
  "message": "Email của user này đã được xác thực"
}
```

**Response (Error - 404):**

```json
{
  "success": false,
  "message": "Người dùng không tồn tại"
}
```

### 2. Contestant Verifies Email

**Endpoint:** `POST /api/auth/verify-email`

**Request Body:**

```json
{
  "user_id": "507f1f77bcf86cd799439011",
  "verification_code": "123456"
}
```

**Response (Success - 200):**

```json
{
  "success": true,
  "message": "Email đã được xác thực thành công",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "full_name": "Nguyễn Văn A",
    "email": "user@example.com",
    "is_verified": true,
    "roles": [
      {
        "role_id": "507f1f77bcf86cd799439012",
        "role_name": "contestant"
      }
    ]
    // ... other fields
  }
}
```

**Response (Error - 400):**

```json
{
  "success": false,
  "message": "Mã xác thực không đúng"
}
```

**Response (Error - 400):**

```json
{
  "success": false,
  "message": "Mã xác thực đã hết hạn"
}
```

## Environment Variables

Add these to your `.env` file:

```env
# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# For Gmail:
# 1. Enable 2-Factor Authentication
# 2. Generate App Password
# 3. Use the App Password as EMAIL_PASSWORD
```

## Flow Diagram

```
1. Contestant Signs Up
   ↓
2. Admin sends verification code
   → Verification code generated (6 digits)
   → Code saved to database (expires in 30 minutes)
   → Email sent to contestant with the code
   ↓
3. Contestant receives email with code
   ↓
4. Contestant submits verification code
   → Code validated
   → is_verified set to true
   → Code cleared from database
   ↓
5. Email verification complete
```

## Implementation Details

### 1. User Model (`src/models/User.js`)

- Added `verification_code` field to store 6-digit code
- Added `verification_code_expires_at` field for code expiration

### 2. Email Service (`src/services/emailService.js`)

- `generateVerificationCode()` - Generates random 6-digit code
- `sendVerificationEmail()` - Sends email with code using nodemailer
- `verifyEmailConnection()` - Tests email service connection

### 3. Auth Service (`src/services/authService.js`)

- `sendVerificationCodeToUser(userId)` - Admin generates and sends code
- `verifyUserEmail(userId, verificationCode)` - Contestant verifies email

### 4. Auth Controller (`src/controllers/authController.js`)

- `sendVerificationCode` - Express handler for sending code
- `verifyEmail` - Express handler for verification

### 5. Auth Routes (`src/routes/authRoute.js`)

- Added POST `/send-verification-code` route
- Added POST `/verify-email` route

## Testing with Postman/Thunder Client

### Test 1: Sign Up

```
POST http://localhost:3000/api/auth/signup
Content-Type: application/json

{
  "full_name": "Test User",
  "email": "test@example.com",
  "password": "password123",
  "phone": "0123456789"
}
```

### Test 2: Send Verification Code (Admin)

```
POST http://localhost:3000/api/auth/send-verification-code
Content-Type: application/json

{
  "user_id": "[Copy _id from signup response]"
}
```

### Test 3: Verify Email (Contestant)

```
POST http://localhost:3000/api/auth/verify-email
Content-Type: application/json

{
  "user_id": "[Same _id]",
  "verification_code": "[Code received in email]"
}
```

## Security Considerations

1. **Code Expiration:** Codes expire after 30 minutes
2. **Code Length:** 6-digit code provides sufficient entropy for this use case
3. **Single Use:** Code is cleared after successful verification
4. **No Rate Limiting:** Consider adding rate limiting for production
5. **HTTPS Only:** Email service credentials should only be used over HTTPS

## Future Enhancements

1. Add rate limiting for verification attempts
2. Add resend verification code functionality with cooldown
3. Add admin dashboard to manage user verification status
4. Add email templating for better styling
5. Add SMS verification as alternative
6. Add verification logs for audit trail

## Troubleshooting

### "Không thể gửi email xác thực"

**Issue:** Email service not configured or credentials invalid

**Solution:**

1. Check `.env` file has EMAIL_USER and EMAIL_PASSWORD
2. Verify Gmail app password is correctly set (not regular password)
3. Ensure "Less secure app access" is disabled (using app passwords)
4. Check internet connection

### "Mã xác thực đã hết hạn"

**Issue:** User waited too long to verify

**Solution:** Admin needs to send verification code again

### Email Not Received

**Issue:** Email provider blocked or spam folder

**Solution:**

1. Check spam/junk folder
2. Verify email address is correct
3. Check Gmail SMTP settings
4. Add to trusted senders

## Notes

- Current implementation uses Gmail SMTP - can be configured for other email services
- Verification codes are 6 random digits (000000-999999)
- Each send overwrites previous code if not verified yet
- User can only verify once - `is_verified` cannot be reverted
