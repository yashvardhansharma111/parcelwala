# Fix Worklets Version Mismatch Error

## Problem
```
[WorkletsError: [Worklets] Mismatch between JavaScript part and native part of Worklets (0.6.1 vs 0.5.1).
```

This happens when the JavaScript dependencies are updated but the native Android app wasn't rebuilt.

## Solution

You need to rebuild the native Android app. Run these commands:

### Option 1: Clean Rebuild (Recommended)

```bash
cd parcelbooking

# Clean the Android build
npx expo prebuild --clean

# Rebuild and run on Android
npx expo run:android
```

### Option 2: If using EAS Build

```bash
cd parcelbooking

# Clean build
eas build --platform android --clear-cache
```

### Option 3: Manual Clean (if above doesn't work)

```bash
cd parcelbooking

# Remove Android folder
rm -rf android  # On Windows: rmdir /s android

# Remove node_modules
rm -rf node_modules  # On Windows: rmdir /s node_modules

# Reinstall dependencies
npm install

# Rebuild native code
npx expo prebuild

# Run on Android
npx expo run:android
```

## About the Warnings

The warnings about missing default exports are **false positives**. The files already have default exports:
- `app/(tabs)/index.tsx` - has `export default function HomeScreen()`
- `app/(tabs)/explore.tsx` - has `export default function TabTwoScreen()`
- `app/(tabs)/_layout.tsx` - has `export default function TabLayout()`

These warnings should disappear after rebuilding.

## Why This Happens

`react-native-reanimated` uses `react-native-worklets` internally. When you update JavaScript dependencies, the native code (compiled C++ code) also needs to be rebuilt to match the new JavaScript version.

