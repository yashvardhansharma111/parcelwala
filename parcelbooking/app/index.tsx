/**
 * Root index — handles parcelbooking:/// and cold starts
 */

import { Redirect } from "expo-router";
import { View } from "react-native";
import { useAuthStore } from "../store/authStore";
import { Loader } from "../components/Loader";

export default function Index() {
  const { user, isAuthenticated, loading } = useAuthStore();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Loader fullScreen />
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    return <Redirect href="/login" />;
  }

  return <Redirect href="/(customer)/(tabs)" />;
}
