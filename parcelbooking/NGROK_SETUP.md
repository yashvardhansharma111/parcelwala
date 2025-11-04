# 🚀 Using Ngrok for Backend API Access

Ngrok is a great solution for testing your backend API on physical devices without worrying about IP addresses or network configuration.

## ✅ Your Ngrok Setup

Your ngrok URL: `https://dee6839993d2.ngrok-free.app`

## 📝 Configuration

### Step 1: Update `.env` File

Add or update your `.env` file in the `parcelbooking` folder:

```env
EXPO_PUBLIC_API_BASE_URL=https://dee6839993d2.ngrok-free.app
```

**Important:** 
- ✅ Use HTTPS (ngrok provides HTTPS by default)
- ✅ No trailing slash (the config will handle it)
- ✅ Don't include `/health` or any path

### Step 2: Restart Expo App

After updating `.env`:
```bash
# Stop the app (Ctrl+C)
# Restart with cache clear
expo start -c
```

### Step 3: Verify Connection

The app will now use your ngrok URL for all API requests. You can test it by:
1. Opening the app
2. Trying to send OTP
3. Check Expo console for: `[API] POST https://dee6839993d2.ngrok-free.app/auth/send-otp`

---

## 🔧 Ngrok Setup (If Starting Fresh)

### Install Ngrok

```bash
npm install -g ngrok
# Or use npx: npx ngrok http 8080
```

### Start Ngrok

```bash
ngrok http 8080
```

This will show:
```
Forwarding: https://your-random-id.ngrok-free.app -> http://localhost:8080
```

### Update `.env`

Use the HTTPS URL shown by ngrok:
```env
EXPO_PUBLIC_API_BASE_URL=https://your-random-id.ngrok-free.app
```

---

## ⚠️ Important Notes

### 1. Ngrok Browser Warning

When using ngrok free tier, the first request from a new IP might show a warning page. This can affect API calls.

**Solution**: You can disable the warning page:
```bash
ngrok http 8080 --host-header="localhost:8080"
```

Or add ngrok-skip-browser-warning header (handled automatically by the API client).

### 2. Ngrok URL Changes

- **Free tier**: URL changes every time you restart ngrok
- **Paid tier**: Can have fixed custom domains

**Solution**: Update `.env` when ngrok restarts, or use a fixed domain.

### 3. Ngrok Session Expiry

- Free tier sessions expire after 2 hours of inactivity
- Paid tier has longer sessions

**Solution**: Keep ngrok running, or use it for testing only.

---

## 🔍 Troubleshooting

### Issue: "Network request failed" with ngrok

**Check:**
1. Ngrok is still running (`ngrok http 8080`)
2. Backend is running on port 8080
3. `.env` has correct ngrok URL (without trailing slash)
4. App was restarted after `.env` changes

**Test ngrok:**
```bash
curl https://dee6839993d2.ngrok-free.app/health
```

Should return:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "..."
}
```

### Issue: Browser warning page blocking requests

**Solution**: 
- Add ngrok-skip-browser-warning header (we can add this to API client)
- Or use ngrok with `--host-header` flag
- Or click through the warning once from your device's browser

---

## 🎯 Benefits of Using Ngrok

✅ Works on all devices (emulator, simulator, physical)  
✅ No need to configure IP addresses  
✅ Works from anywhere (not just same network)  
✅ HTTPS enabled by default  
✅ Great for testing and demos  

---

## 📱 Quick Setup Summary

1. **Start ngrok**: `ngrok http 8080`
2. **Copy HTTPS URL**: `https://dee6839993d2.ngrok-free.app`
3. **Update `.env`**: `EXPO_PUBLIC_API_BASE_URL=https://dee6839993d2.ngrok-free.app`
4. **Restart app**: `expo start -c`
5. **Test**: Try sending OTP in the app

---

## 🔄 Switching Between Ngrok and Local

### To use ngrok:
```env
EXPO_PUBLIC_API_BASE_URL=https://dee6839993d2.ngrok-free.app
```

### To use local IP (for physical device):
```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.29.34:8080
```

### To use localhost (for emulator/simulator):
```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
# Or remove the line to use auto-detection
```

**Remember**: Always restart the app after changing `.env`!

---

Your ngrok setup is ready! The app will now use `https://dee6839993d2.ngrok-free.app` for all backend requests.

