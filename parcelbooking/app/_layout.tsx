/**
 * Root Layout
 * Handles navigation and authentication routing
 */

import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useAuthStore } from '../store/authStore';
import { useAuth } from '../hooks/useAuth';
import { Loader } from '../components/Loader';
import { View } from 'react-native';
import { isExpoGo } from '../services/notificationService';

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

  useEffect(() => {
    const initAuth = async () => {
      await checkAuthState();
      // Wait a bit for router to be ready
      setTimeout(() => setIsReady(true), 100);
    };
    initAuth();
  }, []);

  useEffect(() => {
    // Don't navigate until router is ready and we've checked auth
    if (!isReady || loading || !segments || segments.length === 0) return;

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
