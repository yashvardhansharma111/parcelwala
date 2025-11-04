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

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const { user, isAuthenticated, loading } = useAuthStore();
  const { checkAuthState } = useAuth();
  const [isReady, setIsReady] = useState(false);

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
