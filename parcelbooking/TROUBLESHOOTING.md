# 🔧 Troubleshooting Guide

## Network Request Failed Issues

### ✅ If browser works but app doesn't

#### 1. Check Your Environment Variable

Make sure `EXPO_PUBLIC_API_BASE_URL` is set correctly:

**For Physical Android Device:**
```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:8080
```
Replace `192.168.1.100` with your computer's actual IP address.

**For Android Emulator:**
- No `.env` needed - auto-detects `10.0.2.2:8080`
- OR set: `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8080`

**For iOS Simulator:**
```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
```

**For iOS Physical Device:**
```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:8080
```

#### 2. Find Your Computer's IP Address

**Windows:**
```bash
ipconfig
# Look for "IPv4 Address" under your active network
```

**macOS/Linux:**
```bash
ifconfig | grep "inet "
# Or
ip addr show
```

#### 3. Verify Backend is Accessible

From your **phone's browser** (same Wi-Fi network), try:
```
http://YOUR_IP:8080/health
```

Should return:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "..."
}
```

If this doesn't work:
- Check backend is running
- Check firewall allows port 8080
- Verify both devices on same network

#### 4. Restart After .env Changes

After changing `.env`, **fully restart** your Expo app:
1. Stop the app (Ctrl+C)
2. Clear cache: `expo start -c`
3. Rebuild the app

#### 5. Check Console Logs

Look for these logs in your Expo console:
```
[API] POST http://YOUR_IP:8080/auth/send-otp
[API Error] http://YOUR_IP:8080/auth/send-otp: Network request failed
[API Config] Base URL: http://YOUR_IP:8080
[API Config] Platform: android
```

#### 6. Test Connection Function

You can test the connection in your app:
```typescript
import { testConnection } from "./services/apiClient";

// In your component
await testConnection();
```

---

## Common Issues & Solutions

### Issue: "Android cannot use 'localhost'"

**Problem**: Android apps cannot access `localhost` - it refers to the device itself, not your computer.

**Solution**: 
- For emulator: Use `10.0.2.2:8080` (auto-detected)
- For physical device: Use your computer's IP (e.g., `192.168.1.100:8080`)

### Issue: "Network request failed" with correct IP

**Check:**
1. Backend is running: `curl http://localhost:8080/health`
2. Backend accessible from phone browser
3. Firewall allows port 8080
4. Both devices on same Wi-Fi network
5. IP address hasn't changed (DHCP might assign new IP)

**Solution**: Restart backend and verify it's listening on `0.0.0.0:8080`

### Issue: "Cannot reach backend"

**Check:**
- Backend logs show it's running
- Backend is bound to `0.0.0.0` not just `127.0.0.1`
- CORS is properly configured
- Network security policy (Android) allows HTTP (for development)

**Solution**: 
- Backend should use `app.listen(PORT, "0.0.0.0", ...)`
- Check backend `server.ts` file

### Issue: Works on emulator but not physical device

**Problem**: Emulator uses `10.0.2.2`, physical device needs actual IP.

**Solution**: Set `EXPO_PUBLIC_API_BASE_URL` to your computer's IP in `.env`

---

## Debug Checklist

- [ ] Backend running (`npm run dev` in backend folder)
- [ ] Backend accessible via `http://localhost:8080/health`
- [ ] Backend accessible via `http://YOUR_IP:8080/health` from phone browser
- [ ] `.env` file has correct `EXPO_PUBLIC_API_BASE_URL`
- [ ] App restarted after `.env` changes
- [ ] Both devices on same Wi-Fi network
- [ ] Firewall allows port 8080
- [ ] Check Expo console for error logs
- [ ] Check backend console for request logs

---

## Testing Connection

1. **From Computer Browser:**
   ```
   http://localhost:8080/health
   ```

2. **From Phone Browser (Same Wi-Fi):**
   ```
   http://YOUR_IP:8080/health
   ```

3. **From App:**
   - Check Expo console for `[API Test]` logs
   - Look for error messages with suggestions

---

## Still Not Working?

1. **Try using ngrok** for testing:
   ```bash
   npx ngrok http 8080
   # Use the ngrok URL in EXPO_PUBLIC_API_BASE_URL
   ```

2. **Check network security policy** (Android):
   - Development: HTTP might be blocked
   - Use HTTPS or configure network security config

3. **Use a physical cable** if Wi-Fi is unstable

4. **Check backend logs** for incoming requests

5. **Verify CORS** in backend is allowing your requests

---

**Need more help?** Check the console logs - they now provide specific suggestions based on your platform and configuration!

