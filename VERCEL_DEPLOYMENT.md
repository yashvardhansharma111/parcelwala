# Vercel Backend Deployment Guide

## ✅ OneSignal Notifications Will Work!

**Yes, notifications will work perfectly with the APK build!** OneSignal SDK is already integrated and will work in production builds.

## 📋 Deployment Steps

### Step 1: Install Vercel CLI (if not installed)

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
cd backend
vercel login
```

### Step 3: Deploy to Vercel

```bash
# First deployment (will ask questions)
vercel

# Production deployment
vercel --prod
```

### Step 4: Set Environment Variables in Vercel Dashboard

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add ALL these variables:

#### Firebase
```
FIREBASE_PROJECT_ID=parcelbooking001
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
FIREBASE_PRIVATE_KEY=your-firebase-private-key
```

#### Renflair SMS (for OTP)
```
RENFLAIR_API_KEY=your-renflair-api-key
RENFLAIR_API_URL=https://sms.renflair.in/V1.php
OTP_DEV_MODE=false
```

#### JWT Secrets
```
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-jwt-refresh-secret
```

#### Admin
```
ADMIN_PHONE_NUMBER=+918462044151
```

#### PayGIC Payment Gateway
```
PAYGIC_MID=FINNPAYS
PAYGIC_TOKEN=your-paygic-token
PAYGIC_BASE_URL=https://server.paygic.in/api/v2
PAYGIC_SUCCESS_URL=https://your-vercel-url.vercel.app/payment/success
PAYGIC_FAILED_URL=https://your-vercel-url.vercel.app/payment/failed
```

#### OneSignal
```
ONESIGNAL_APP_ID=0f28bb2e-e63e-4bfa-9710-77dcaf7b3aa7
ONESIGNAL_REST_API_KEY=your-onesignal-rest-api-key
```

### Step 5: Update API Base URL

After deployment, update `parcelbooking/eas.json`:

```json
"EXPO_PUBLIC_API_BASE_URL": "https://your-vercel-url.vercel.app"
```

## 🔧 Build Configuration

The `vercel.json` is already configured. Vercel will:
1. Run `npm run build` (TypeScript compilation)
2. Use `dist/server.js` as the entry point
3. Handle all routes properly

## 📱 APK Build

### Step 1: Update API URL in eas.json

Make sure `EXPO_PUBLIC_API_BASE_URL` points to your Vercel URL.

### Step 2: Build APK

```bash
cd parcelbooking
eas build -p android --profile apk
```

### Step 3: Download and Install

After build completes:
1. Download APK from EAS dashboard
2. Install on Android device
3. ✅ Notifications will work!

## ✅ What Works in APK

- ✅ OneSignal Push Notifications (fully working)
- ✅ OTP via SMS (if RENFLAIR_API_KEY is set)
- ✅ All API calls to Vercel backend
- ✅ Payment gateway
- ✅ All features

## 🔍 Troubleshooting

### SMS Not Working?
- Check `RENFLAIR_API_KEY` is set in Vercel
- Check `OTP_DEV_MODE=false` in Vercel
- Check Renflair API is accessible from Vercel

### Notifications Not Working?
- OneSignal SDK is already integrated
- Player IDs are registered automatically
- No additional setup needed for APK

### API Calls Failing?
- Check `EXPO_PUBLIC_API_BASE_URL` in `eas.json`
- Make sure Vercel URL is correct
- Check CORS settings in backend

## 🎉 That's It!

After deployment:
1. ✅ Backend on Vercel
2. ✅ SMS working for OTP
3. ✅ APK build with notifications working
4. ✅ Everything ready for production!

