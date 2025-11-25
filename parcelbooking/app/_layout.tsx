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
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
        receivedSubscription = Notifications.addNotificationReceivedListener(() => {
          // Notification received - handled silently
        });

        // Listener for when user taps on notification
        responseSubscription = Notifications.addNotificationResponseReceivedListener(() => {
          // Notification tapped - handled by navigation
        });
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
      const parsed = Linking.parse(url);

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

        if (fullPath.includes('success') || pathname?.includes('success')) {
          // Navigate to payment success screen
          if (isAuthenticated && user) {
            // Build query string from params
            const filteredParams = Object.entries(params)
              .filter(([key]) => key !== 'scheme' && key !== 'package'); // Filter out intent-specific params
            const queryString = filteredParams
              .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
              .join('&');
            
            // Use replace to prevent going back to payment screen
            // The success screen will show a loading state while processing
            router.replace(`/(customer)/payment/success?${queryString}` as any);
          }
        } else if (fullPath.includes('failed') || pathname?.includes('failed')) {
          // Navigate to payment failed screen
          if (isAuthenticated && user) {
            const filteredParams = Object.entries(params)
              .filter(([key]) => key !== 'scheme' && key !== 'package');
            const queryString = filteredParams
              .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
              .join('&');
            
            // Navigate to booking history with payment failed flag
            router.push(`/(customer)/booking/history?paymentFailed=true&${queryString}` as any);
          }
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.error('[DeepLink] Error handling deep link:', error);
      }
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
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    }).catch((error) => {
      if (__DEV__) console.error('[DeepLink] Error getting initial URL:', error);
    });

    // Listen for deep links when app is already running
    const subscription = Linking.addEventListener('url', (event) => {
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
        // BUT: Don't redirect if user is on payment success screen
        if (!pathname?.includes('payment/success') && !pathname?.includes('payment/')) {
        try {
          router.replace('/(customer)/home');
        } catch (error) {
          // Router might not be ready yet, ignore
          }
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
    <SafeAreaProvider>
      <Stack>
        <Stack.Screen name="login/index" options={{ headerShown: false }} />
        <Stack.Screen name="(customer)" options={{ headerShown: false }} />
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
