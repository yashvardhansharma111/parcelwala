# 📱 Device Setup Guide for Backend API

This guide helps you configure the API base URL for different development environments.

## 🔧 Network Configuration

### Android Emulator
The Android emulator uses a special IP to access your host machine:
```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8080
```

### iOS Simulator
iOS simulator can use localhost directly:
```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
```

### Physical Devices (Android & iOS)
Physical devices need your computer's actual IP address on the local network.

#### Step 1: Find Your Computer's IP Address

**Windows:**
```bash
ipconfig
# Look for "IPv4 Address" under your active network adapter
# Example: 192.168.1.100
```

**macOS/Linux:**
```bash
ifconfig | grep "inet "
# Or
ip addr show
# Look for your network interface (usually eth0, wlan0, or en0)
# Example: 192.168.1.100
```

#### Step 2: Update .env File
```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:8080
```
Replace `192.168.1.100` with your actual IP address.

#### Step 3: Ensure Devices Are on Same Network
- Your computer and mobile device must be on the same Wi-Fi network
- Check firewall settings - port 8080 should be accessible

---

## 🚀 Quick Setup

### Option 1: Auto-Detection (Default)
The app automatically uses:
- **Android Emulator**: `10.0.2.2:8080`
- **iOS Simulator**: `localhost:8080`
- **Physical Devices**: Requires setting `EXPO_PUBLIC_API_BASE_URL`

### Option 2: Manual Configuration
Set `EXPO_PUBLIC_API_BASE_URL` in your `.env` file for all cases.

---

## 🔍 Troubleshooting Network Issues

### Issue: "Network request failed" on Physical Device

**Solution 1**: Set the IP address in `.env`
```env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_IP:8080
```

**Solution 2**: Check backend is accessible
```bash
# On your computer, test if backend is running:
curl http://localhost:8080/health

# From your phone's browser (same Wi-Fi), try:
http://YOUR_IP:8080/health
```

**Solution 3**: Check firewall
- Windows: Allow port 8080 in Windows Firewall
- macOS: Allow incoming connections on port 8080
- Linux: Configure ufw/iptables to allow port 8080

**Solution 4**: Check backend is bound to 0.0.0.0
Make sure your backend server listens on all interfaces:
```typescript
// In server.ts
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
```

### Issue: Backend works in browser but not in app

- Check CORS settings in backend
- Verify the IP address is correct
- Ensure both devices are on the same network

---

## 📋 Checklist

- [ ] Backend is running on port 8080
- [ ] Backend is accessible via `http://localhost:8080/health`
- [ ] For physical devices: Found computer's IP address
- [ ] Set `EXPO_PUBLIC_API_BASE_URL` in `.env` (if needed)
- [ ] Devices are on the same Wi-Fi network
- [ ] Firewall allows port 8080
- [ ] Backend CORS is configured for mobile requests

---

## 🌐 Production Setup

For production, use your deployed backend URL:
```env
EXPO_PUBLIC_API_BASE_URL=https://your-backend-domain.com
```

Make sure:
- Backend has HTTPS enabled
- CORS is properly configured
- Backend is publicly accessible

---

## 💡 Pro Tips

1. **Use ngrok for testing on physical devices:**
   ```bash
   npx ngrok http 8080
   # Use the ngrok URL in EXPO_PUBLIC_API_BASE_URL
   ```

2. **Use a fixed IP on your router** for your development machine

3. **Create separate .env files** for different environments:
   - `.env.development` - localhost/emulator
   - `.env.device` - physical device IP
   - `.env.production` - production URL

