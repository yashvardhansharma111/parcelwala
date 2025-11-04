# 🔄 Migration Guide: Firebase Auth → Custom Backend API

This guide documents the migration from Firebase Auth OTP authentication to the custom backend API authentication.

## 📋 Changes Overview

### What Changed
- **Authentication**: Switched from Firebase Auth OTP to backend API OTP
- **Token Management**: Now using JWT (access + refresh tokens) instead of Firebase Auth tokens
- **Storage**: Using AsyncStorage for secure token storage
- **API Client**: New centralized API client with automatic token refresh

### What Stayed the Same
- Firebase Firestore: Still used for data operations (bookings, users, etc.)
- UI/UX: Login flow remains the same
- Zustand Store: Same structure, works with new auth service

---

## 🆕 New Files

### 1. `services/apiClient.ts`
Centralized API client that handles:
- HTTP requests to backend
- Automatic token injection in headers
- Automatic token refresh on 401 errors
- Error handling

### 2. `services/tokenStorage.ts`
Token storage service using AsyncStorage:
- `setAccessToken()` / `getAccessToken()`
- `setRefreshToken()` / `getRefreshToken()`
- `setUser()` / `getUser()`
- `clearTokens()`

### 3. `config/apiConfig.ts`
Backend API configuration:
```typescript
{
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:8080",
  timeout: 30000
}
```

---

## 📝 Modified Files

### 1. `services/authService.ts`
**Before**: Used Firebase Auth (`signInWithPhoneNumber`, `signInWithCredential`)
**After**: Uses backend API (`authApi.sendOTP`, `authApi.verifyOTP`)

**Key Changes**:
- `sendOTP()` → Calls `POST /auth/send-otp`
- `verifyOTP()` → Calls `POST /auth/verify-otp` and stores JWT tokens
- `signOut()` → Calls `POST /auth/logout` and clears tokens
- `getCurrentUser()` → Checks token, fetches from API if needed

### 2. `hooks/useAuth.ts`
**Changes**:
- Now uses token-based authentication
- `checkAuthState()` checks for stored access token
- Handles token refresh automatically via API client

### 3. `config/index.ts`
**Added**:
- `api: apiConfig` to AppConfig

### 4. `config/env.example.ts`
**Added**:
- `EXPO_PUBLIC_API_BASE_URL` environment variable

---

## 🔧 Setup Instructions

### 1. Environment Variables

Add to your `.env` file:
```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
# For production:
# EXPO_PUBLIC_API_BASE_URL=https://your-backend-domain.com
```

### 2. Backend Must Be Running

Ensure your backend server is running on the configured port (default: 8080).

### 3. No Code Changes Needed

The migration is transparent - the same functions are used:
- `sendOTP(phoneNumber)`
- `verifyOTP(code)`
- `logout()`
- `getCurrentUser()`

---

## 🔐 Authentication Flow

### New Flow (Backend API)

1. **User enters phone number**
   - `sendOTP()` → `POST /auth/send-otp`
   - Backend generates OTP, stores in NodeCache, sends SMS via Renflair

2. **User enters OTP**
   - `verifyOTP()` → `POST /auth/verify-otp`
   - Backend verifies OTP, creates/fetches user, returns JWT tokens
   - App stores `accessToken` and `refreshToken` in AsyncStorage

3. **API Requests**
   - API client automatically adds `Authorization: Bearer <accessToken>` header
   - On 401 error, automatically refreshes token and retries request

4. **Token Refresh**
   - `accessToken` expires in 15 minutes
   - `refreshToken` expires in 7 days
   - API client handles refresh automatically

5. **Logout**
   - `logout()` → `POST /auth/logout` (invalidates refresh token)
   - Clears all tokens from AsyncStorage

### Old Flow (Firebase Auth)

1. `signInWithPhoneNumber()` → Firebase handles SMS
2. `signInWithCredential()` → Firebase verifies OTP
3. Firebase Auth token stored internally
4. Logout clears Firebase Auth session

---

## 🧪 Testing

### Test the Migration

1. **Start Backend**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Frontend**:
   ```bash
   cd parcelbooking
   npm start
   ```

3. **Test Login Flow**:
   - Enter phone number
   - Receive OTP via SMS (via Renflair)
   - Enter OTP
   - Should navigate to home/dashboard

4. **Test Token Refresh**:
   - Use app normally
   - API client will automatically refresh token when needed

5. **Test Logout**:
   - Click logout
   - Should clear tokens and redirect to login

---

## 🔍 Troubleshooting

### Issue: "Failed to send OTP"
- **Check**: Backend is running and accessible
- **Check**: `EXPO_PUBLIC_API_BASE_URL` is set correctly
- **Check**: Backend logs for errors

### Issue: "Invalid or expired OTP"
- **Check**: OTP was entered within 5 minutes
- **Check**: OTP is 6 digits
- **Check**: Backend OTP generation/storage

### Issue: "Session expired. Please login again."
- **Check**: Refresh token is still valid (7 days)
- **Check**: Backend refresh endpoint is working
- **Solution**: User needs to login again

### Issue: API calls fail with 401
- **Check**: Access token exists in storage
- **Check**: Token refresh logic in API client
- **Check**: Backend JWT verification

---

## 📱 Mobile App Considerations

### AsyncStorage
- Tokens are stored securely using `@react-native-async-storage/async-storage`
- Cleared on logout
- Persists across app restarts

### Network Errors
- API client handles network failures gracefully
- Shows appropriate error messages
- Retries token refresh automatically

### Offline Mode
- User data cached in AsyncStorage
- Can display cached user info when offline
- API calls will fail but won't crash app

---

## 🔄 Rollback Plan

If you need to rollback to Firebase Auth:

1. Restore `services/authService.ts` from git history
2. Remove `services/apiClient.ts`
3. Remove `services/tokenStorage.ts`
4. Remove `config/apiConfig.ts`
5. Remove `EXPO_PUBLIC_API_BASE_URL` from `.env`

---

## 📚 Additional Resources

- [Backend API Documentation](../backend/API_DOCUMENTATION.md)
- [Backend Setup Guide](../backend/SETUP_ENV.md)

---

**Migration Completed**: ✅  
**Date**: January 2024  
**Version**: 1.0.0

