// app.config.js
const appJson = require('./app.json');

module.exports = function (config) {
  const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || (appJson.expo?.extra?.onesignal?.appId) || null;

  // Merge plugins from app.json and config, prioritizing config plugins
  const appJsonPlugins = appJson.expo.plugins || [];
  const configPlugins = config.plugins || [];

  // Create a map to track plugins by name to avoid duplicates
  const pluginMap = new Map();

  // Add app.json plugins first
  appJsonPlugins.forEach(plugin => {
    const pluginName = typeof plugin === 'string' ? plugin : plugin[0];
    pluginMap.set(pluginName, plugin);
  });

  // Override with config plugins (config takes precedence)
  configPlugins.forEach(plugin => {
    const pluginName = typeof plugin === 'string' ? plugin : plugin[0];
    pluginMap.set(pluginName, plugin);
  });

  // Ensure onesignal-expo-plugin exists
  if (!pluginMap.has('onesignal-expo-plugin')) {
    pluginMap.set('onesignal-expo-plugin', 'onesignal-expo-plugin');
  }

  // Convert back to array and filter out worklets
  const allPlugins = Array.from(pluginMap.values());
  const filteredPlugins = allPlugins.filter(plugin => {
    if (typeof plugin === 'string' && plugin.includes('worklets')) return false;
    if (Array.isArray(plugin) && typeof plugin[0] === 'string' && plugin[0].includes('worklets')) return false;
    return true;
  });

  // Build extra without forcing eas.projectId so EAS can re-init/link a new project.
  const extra = {
    ...appJson.expo.extra,
    ...config.extra,
    onesignal: {
      ...(appJson.expo?.extra?.onesignal || config.extra?.onesignal || {}),
      appId: ONESIGNAL_APP_ID || (appJson.expo?.extra?.onesignal?.appId || null)
    }
  };

  // Ensure android.package is preserved (required by EAS CLI)
  const android = {
    ...appJson.expo.android,
    ...config.android,
    package: config.android?.package || appJson.expo.android?.package || "com.ratlam.parcelbooking",
    usesCleartextTraffic: true,
    googleServicesFile: config.android?.googleServicesFile || appJson.expo.android?.googleServicesFile || "./google-services.json"
  };

  return {
    ...config,
    owner: config.owner || appJson.expo.owner || "yashvardhansharma001",
    slug: config.slug || appJson.expo.slug || "parcelbooking",
    name: config.name || appJson.expo.name || "ParcelBooking",
    scheme: config.scheme || appJson.expo.scheme || "parcelbooking",
    plugins: filteredPlugins,
    android: {
      ...android,
      package: android.package || "com.ratlam.parcelbooking",
    },
    extra,
    ios: config.ios || appJson.expo.ios,
    web: config.web || appJson.expo.web,
  };
};
