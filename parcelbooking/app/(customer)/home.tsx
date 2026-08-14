/**
 * Legacy home route → tabs
 */

import { Redirect } from "expo-router";

export default function LegacyHomeRedirect() {
  return <Redirect href="/(customer)/(tabs)" />;
}
