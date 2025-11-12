/**
 * Root Layout
 * Handles navigation and authentication routing
 */

import { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter, useSegments, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import 'react-native-reanimated';
import { useAuthStore } from '../store/authStore';
import { useAuth } from '../hooks/useAuth';
import { Loader } from '../components/Loader';
import { View } from 'react-native';
import { isExpoGo } from '../services/notificationService';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const { user, isAuthenticated, loading } = useAuthStore();
  const { checkAuthState } = useAuth();
  const [isReady, setIsReady] = useState(false);

  // Set up notification listeners early (before registration)
  useEffect(() => {
    // Skip if Expo Go
    if (isExpoGo()) {
      return;
    }

    let receivedSubscription: any = null;
    let responseSubscription: any = null;

    const setupListeners = async () => {
      try {
        const Notifications = await import("expo-notifications");
        
        // Listener for when notification is received while app is foregrounded
        receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
          console.log("🔔 Notification received:", {
            title: notification.request.content.title,
            body: notification.request.content.body,
            data: notification.request.content.data,
          });
        });

        // Listener for when user taps on notification
        responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
          console.log("👆 Notification tapped:", {
            title: response.notification.request.content.title,
            body: response.notification.request.content.body,
            data: response.notification.request.content.data,
          });
        });

        console.log("[Notifications] Listeners mounted in _layout.tsx");
      } catch (error) {
        console.warn("[Notifications] Failed to set up listeners in _layout:", error);
      }
    };

    setupListeners();

    // Cleanup on unmount
    return () => {
      if (receivedSubscription) {
        receivedSubscription.remove();
      }
      if (responseSubscription) {
        responseSubscription.remove();
      }
    };
  }, []);

  // Handle deep links function
  const handleDeepLink = useCallback((url: string) => {
    try {
      console.log('[DeepLink] 🔵 ========== DEEP LINK RECEIVED ==========');
      console.log('[DeepLink] 📥 Raw URL:', url);
      console.log('[DeepLink] 📱 App state:', {
        isReady: isReady,
        isAuthenticated: isAuthenticated,
        hasUser: !!user,
        userId: user?.id,
      });
      
      const parsed = Linking.parse(url);
      console.log('[DeepLink] 🔍 Parsed URL structure:', {
        scheme: parsed.scheme,
        hostname: parsed.hostname,
        path: parsed.path,
        pathname: parsed.pathname,
        queryParams: parsed.queryParams,
        fullParsed: parsed,
      });

      // Handle parcelbooking://payment/success or parcelbooking://payment/failed
      // Also handle intent:// URLs from Android
      const scheme = parsed.scheme || '';
      const hostname = parsed.hostname || '';
      const path = parsed.path || '';
      const pathname = parsed.pathname || '';
      
      // Check for parcelbooking:// scheme or intent:// with parcelbooking scheme
      const isParcelBookingScheme = scheme === 'parcelbooking' || 
                                    (scheme === 'intent' && parsed.queryParams?.scheme === 'parcelbooking');
      const isPaymentHost = hostname === 'payment' || pathname?.includes('payment');
      
      if (isParcelBookingScheme && isPaymentHost) {
        const params = parsed.queryParams || {};
        const fullPath = path || pathname || '';
        
        console.log('[DeepLink] Payment deep link detected:', { scheme, hostname, path, pathname, fullPath, params });

        if (fullPath.includes('success') || pathname?.includes('success')) {
          // Navigate to payment success screen
          console.log('[DeepLink] ✅ Payment success deep link detected');
          console.log('[DeepLink] 📋 Extracted params:', params);
          console.log('[DeepLink] 🔐 Auth status:', {
            isAuthenticated: isAuthenticated,
            hasUser: !!user,
            userId: user?.id,
          });
          
          if (isAuthenticated && user) {
            // Build query string from params
            const filteredParams = Object.entries(params)
              .filter(([key]) => key !== 'scheme' && key !== 'package'); // Filter out intent-specific params
            const queryString = filteredParams
              .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
              .join('&');
            
            console.log('[DeepLink] 🚀 Navigating to payment success screen');
            console.log('[DeepLink] 📍 Route:', `/(customer)/payment/success?${queryString}`);
            console.log('[DeepLink] 📊 Query params:', filteredParams);
            
            router.push(`/(customer)/payment/success?${queryString}` as any);
            console.log('[DeepLink] ✅ Navigation triggered');
          } else {
            // Store deep link to navigate after auth
            console.log('[DeepLink] ⚠️  User not authenticated, will navigate after login');
            // The auth flow will handle this after login
          }
        } else if (fullPath.includes('failed') || pathname?.includes('failed')) {
          // Navigate to payment failed screen
          console.log('[DeepLink] ❌ Payment failed deep link detected');
          console.log('[DeepLink] 📋 Extracted params:', params);
          
          if (isAuthenticated && user) {
            const filteredParams = Object.entries(params)
              .filter(([key]) => key !== 'scheme' && key !== 'package');
            const queryString = filteredParams
              .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
              .join('&');
            
            console.log('[DeepLink] 🚀 Navigating to booking history with payment failed flag');
            console.log('[DeepLink] 📍 Route:', `/(customer)/booking/history?paymentFailed=true&${queryString}`);
            
            // Navigate to booking history with payment failed flag
            router.push(`/(customer)/booking/history?paymentFailed=true&${queryString}` as any);
            console.log('[DeepLink] ✅ Navigation triggered');
          } else {
            console.log('[DeepLink] ⚠️  User not authenticated for failed payment');
          }
        } else {
          console.log('[DeepLink] ⚠️  Unknown payment deep link path:', { fullPath, pathname });
        }
      }
    } catch (error) {
      console.error('[DeepLink] ❌ ========== ERROR HANDLING DEEP LINK ==========');
      console.error('[DeepLink] ❌ Error details:', {
        error: error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        url: url,
        timestamp: new Date().toISOString(),
      });
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    const initAuth = async () => {
      await checkAuthState();
      // Wait a bit for router to be ready
      setTimeout(() => setIsReady(true), 100);
    };
    initAuth();
  }, []);

  // Handle deep links when app is opened from closed state
  useEffect(() => {
    if (!isReady) return;

    // Check if app was opened via deep link
    console.log('[DeepLink] 🔍 Checking for initial deep link URL...');
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('[DeepLink] 📱 App opened from closed state with deep link:', url);
        handleDeepLink(url);
      } else {
        console.log('[DeepLink] ℹ️  No initial deep link URL found (app opened normally)');
      }
    }).catch((error) => {
      console.error('[DeepLink] ❌ Error getting initial URL:', error);
    });

    // Listen for deep links when app is already running
    console.log('[DeepLink] 👂 Setting up deep link listener for running app...');
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('[DeepLink] 📱 Deep link received while app is running:', event.url);
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [isReady, isAuthenticated, user, handleDeepLink]);

  // Hide splash screen when app is ready
  useEffect(() => {
    if (isReady && !loading) {
      // Hide splash screen after a short delay to ensure smooth transition
      setTimeout(() => {
        SplashScreen.hideAsync().catch(() => {
          // Ignore errors if splash screen is already hidden
        });
      }, 500);
    }
  }, [isReady, loading]);

  useEffect(() => {
    // Don't navigate until router is ready and we've checked auth
    if (!isReady || loading || !segments) return;

    const currentSegment = segments[0];
    const inAuthGroup = currentSegment === 'login';
    const inCustomerGroup = currentSegment === '(customer)';
    const inAdminGroup = currentSegment === '(admin)';

    // Prevent navigation loops by checking current pathname
    if (!isAuthenticated && !inAuthGroup && pathname !== '/login' && !pathname.startsWith('/login')) {
      // Redirect to login if not authenticated
      try {
        router.replace('/login' as any);
      } catch (error) {
        // Router might not be ready yet, ignore
      }
    } else if (isAuthenticated && user) {
      if (inAuthGroup) {
        // Redirect based on user role
        try {
          if (user.role === 'admin') {
            router.replace('/(admin)/dashboard');
          } else {
            router.replace('/(customer)/home');
          }
        } catch (error) {
          // Router might not be ready yet, ignore
        }
      } else if (user.role === 'admin' && !inAdminGroup && !inAuthGroup) {
        // Admin trying to access customer routes
        try {
          router.replace('/(admin)/dashboard');
        } catch (error) {
          // Router might not be ready yet, ignore
        }
      } else if (user.role === 'customer' && !inCustomerGroup && !inAuthGroup) {
        // Customer trying to access admin routes
        try {
          router.replace('/(customer)/home');
        } catch (error) {
          // Router might not be ready yet, ignore
        }
      }
    }
  }, [isAuthenticated, loading, segments, user, isReady, pathname]);

  // Show loading while checking auth state
  if (loading && !isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Loader fullScreen />
      </View>
    );
  }

  return (
    <>
      <Stack>
        <Stack.Screen name="login/index" options={{ headerShown: false }} />
        <Stack.Screen name="(customer)" options={{ headerShown: false }} />
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
