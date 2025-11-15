# Paygic Token "Invalid Token" Error - Troubleshooting Guide

## Common Causes

The "Invalid token" error from Paygic API usually occurs due to one of these reasons:

### 1. **Token Not Loaded from .env File** ⚠️ (Most Common)

If you're on a VPS (Hostinger), the server might be using the **hardcoded default token** instead of your new token from `.env`.

**Solution:**
1. Check your `.env` file in the backend directory:
   ```bash
   cd /root/parcelwalla_backend
   cat .env | grep PAYGIC_TOKEN
   ```

2. Make sure the token is set correctly (no quotes, no extra spaces):
   ```env
   PAYGIC_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Restart PM2** to reload environment variables:
   ```bash
   pm2 restart parcelwala
   # OR
   pm2 restart all
   ```

4. Check the logs to verify the token is loaded:
   ```bash
   pm2 logs parcelwala --lines 50
   ```
   
   Look for:
   - `🔐 Paygic Token loaded from .env: Yes` ✅
   - `🔐 Paygic Token loaded from .env: No (using default)` ❌

### 2. **Token Has Whitespace**

Sometimes tokens have leading/trailing spaces that cause authentication to fail.

**Solution:**
The code now automatically trims whitespace, but double-check your `.env` file:
```env
# ❌ WRONG (has spaces)
PAYGIC_TOKEN= eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... 

# ✅ CORRECT (no spaces)
PAYGIC_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. **Token Expired or Invalid**

If you just generated a new token, make sure:
- The token is copied **completely** (JWT tokens are long)
- The token hasn't expired
- The token matches your Merchant ID (MID)

**Solution:**
1. Generate a new token from Paygic dashboard
2. Copy the **entire token** (it should start with `eyJ` and be very long)
3. Update `.env` file
4. Restart PM2

### 4. **MID and Token Mismatch**

The Merchant ID (MID) and Token must match. If you changed your MID, you need a new token.

**Solution:**
1. Verify your `PAYGIC_MID` in `.env` matches your Paygic account
2. Generate a token for that specific MID
3. Update both `PAYGIC_MID` and `PAYGIC_TOKEN` in `.env`
4. Restart PM2

## Debugging Steps

### Step 1: Check Current Configuration

After restarting PM2, check the startup logs:
```bash
pm2 logs parcelwala --lines 20
```

You should see:
```
✅ Environment loaded for: production
🔐 Paygic MID configured: Yes (YOUR_MID)
🔐 Paygic Token configured: Yes
🔐 Paygic Token loaded from .env: Yes
🔐 Paygic Token preview: eyJhbGciOiJIUzI1NiI... (length: XXX)
```

### Step 2: Test Payment Creation

When you try to create a payment, check the detailed logs:
```bash
pm2 logs parcelwala --lines 100
```

Look for:
```
🔐 Paygic Request Details: {
  url: 'https://server.paygic.in/api/v2/createPaymentPage',
  mid: 'YOUR_MID',
  tokenLength: XXX,
  tokenPreview: 'eyJhbGciOiJIUzI1NiI...',
  tokenStartsWith: 'eyJhbGciOi',
  isFromEnv: true
}
```

### Step 3: Verify Token Format

Paygic tokens are JWT tokens. They should:
- Start with `eyJ` (base64 encoded JSON)
- Be very long (usually 200+ characters)
- Have 3 parts separated by dots: `header.payload.signature`

Example format:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtaWQiOiJGSU5OUEFZUyIsIl9pZCI6IjY3Njk2MGI0ODJlNTk0MzMyMzYxMTJjOSIsImlhdCI6MTc2Mjg0NTk0OH0.32xSGMhjXWoE9OLNvmrk3exoIQo_BKLW6bg23onaypo
```

## Quick Fix Checklist

- [ ] Token is set in `.env` file (not just in code)
- [ ] No quotes around token in `.env` file
- [ ] No leading/trailing spaces in token
- [ ] PM2 has been restarted after updating `.env`
- [ ] Token matches the Merchant ID (MID)
- [ ] Token is complete (not truncated)
- [ ] Token is valid (not expired)

## Still Not Working?

1. **Contact Paygic Support** with:
   - Your Merchant ID (MID)
   - The error message
   - Request to verify your token is valid

2. **Generate a Fresh Token**:
   - Log into Paygic dashboard
   - Generate a new token
   - Update `.env` immediately
   - Restart PM2

3. **Check Paygic API Documentation**:
   - Visit: https://docs.paygic.in
   - Verify the API endpoint and header format

## Environment Variable Format

Your `.env` file should look like this:

```env
# Paygic Configuration
PAYGIC_MID=YOUR_MERCHANT_ID
PAYGIC_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtaWQiOiJGSU5OUEFZUyIsIl9pZCI6IjY3Njk2MGI0ODJlNTk0MzMyMzYxMTJjOSIsImlhdCI6MTc2Mjg0NTk0OH0.32xSGMhjXWoE9OLNvmrk3exoIQo_BKLW6bg23onaypo
PAYGIC_BASE_URL=https://server.paygic.in/api/v2
PAYGIC_SUCCESS_URL=https://your-domain.com/api/payments/webhook
PAYGIC_FAILED_URL=https://your-domain.com/api/payments/webhook
```

**Important:** 
- No quotes around values
- No spaces before/after `=`
- One token per line
- Restart PM2 after changes

