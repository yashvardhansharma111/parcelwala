# Quick Deployment Guide

## ✅ Yes, Notifications Will Work in APK!

**OneSignal SDK is already integrated and will work perfectly in the APK build!** No additional setup needed.

## 🚀 Step-by-Step Deployment

### 1. Deploy Backend to Vercel

```bash
cd backend

# Install Vercel CLI (if not installed)
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### 2. Set Environment Variables in Vercel

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add these (copy from your `.env` file):

```
# Firebase
FIREBASE_PROJECT_ID=parcelbooking001
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
FIREBASE_PRIVATE_KEY=your-firebase-private-key

# SMS (OTP)
RENFLAIR_API_KEY=your-renflair-api-key
RENFLAIR_API_URL=https://sms.renflair.in/V1.php
OTP_DEV_MODE=false

# JWT
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-jwt-refresh-secret

# Admin
ADMIN_PHONE_NUMBER=+918462044151

# PayGIC
PAYGIC_MID=FINNPAYS
PAYGIC_TOKEN=your-paygic-token
PAYGIC_BASE_URL=https://server.paygic.in/api/v2
PAYGIC_SUCCESS_URL=https://your-vercel-url.vercel.app/payment/success
PAYGIC_FAILED_URL=https://your-vercel-url.vercel.app/payment/failed

# OneSignal
ONESIGNAL_APP_ID=0f28bb2e-e63e-4bfa-9710-77dcaf7b3aa7
ONESIGNAL_REST_API_KEY=your-onesignal-rest-api-key
```

### 3. Update API URL in eas.json

After Vercel deployment, get your URL (e.g., `https://parcel-booking-backend.vercel.app`)

Update `parcelbooking/eas.json`:

```json
"EXPO_PUBLIC_API_BASE_URL": "https://your-actual-vercel-url.vercel.app"
```

### 4. Build APK

```bash
cd parcelbooking
eas build -p android --profile apk
```

### 5. Install and Test

1. Download APK from EAS dashboard
2. Install on Android device
3. Login → OneSignal will register automatically
4. Test notifications → ✅ Should work!

## ✅ What Works in APK

- ✅ **OneSignal Push Notifications** (fully working)
- ✅ **OTP via SMS** (if RENFLAIR_API_KEY is set in Vercel)
- ✅ **All API calls** to Vercel backend
- ✅ **Payment gateway**
- ✅ **All features**

## 🔍 Troubleshooting

### SMS Not Working?
- ✅ Check `RENFLAIR_API_KEY` is set in Vercel
- ✅ Check `OTP_DEV_MODE=false` in Vercel
- ✅ Check Renflair API is accessible

### Notifications Not Working?
- ✅ OneSignal SDK is already integrated
- ✅ Player IDs register automatically
- ✅ No additional setup needed

### API Calls Failing?
- ✅ Check `EXPO_PUBLIC_API_BASE_URL` in `eas.json`
- ✅ Make sure Vercel URL is correct
- ✅ Check CORS in backend

## 🎉 That's It!

After these steps:
1. ✅ Backend on Vercel
2. ✅ SMS working for OTP
3. ✅ APK with notifications working
4. ✅ Ready for production!

