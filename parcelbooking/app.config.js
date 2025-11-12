// app.config.js
const appJson = require('./app.json');

// CRITICAL: Prevent worklets plugin from being auto-detected
// Intercept require calls to prevent loading the worklets plugin
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function (id) {
  // Block loading of react-native-worklets plugin
  if (typeof id === 'string') {
    const normalizedId = id.replace(/\\/g, '/');
    if (
      normalizedId.includes('react-native-worklets/plugin') ||
      normalizedId === 'react-native-worklets/plugin' ||
      normalizedId.endsWith('react-native-worklets/plugin/index.js') ||
      normalizedId.endsWith('react-native-worklets/plugin/index')
    ) {
      // Return a no-op plugin function that returns empty config
      console.warn('[app.config.js] Blocked loading of react-native-worklets/plugin');
      return function () {
        return {
          name: 'react-native-worklets/plugin',
          // Return empty config to prevent errors
        };
      };
    }
  }
  try {
    return originalRequire.apply(this, arguments);
  } catch (error) {
    // If it's a worklets-related error, return a no-op
    if (error.message && error.message.includes('worklets')) {
      console.warn('[app.config.js] Caught worklets error, returning no-op:', error.message);
      return function () {
        return {};
      };
    }
    throw error;
  }
};

// Helper function to check if a plugin is worklets-related
const isWorkletsPlugin = (plugin) => {
  if (!plugin) return false;
  try {
    const pluginName = typeof plugin === 'string' ? plugin : (Array.isArray(plugin) ? plugin[0] : null);
    if (!pluginName) return false;
    const name = String(pluginName).toLowerCase();
    return name.includes('worklets') || name.includes('react-native-worklets');
  } catch (e) {
    // If we can't check the plugin, exclude it to be safe
    return true;
  }
};

module.exports = function (config) {
  const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || (appJson.expo?.extra?.onesignal?.appId) || null;

  // Prevent auto-detection by marking worklets as excluded in _internal
  if (!config._internal) config._internal = {};
  if (!config._internal.pluginHistory) config._internal.pluginHistory = {};
  config._internal.pluginHistory['react-native-worklets/plugin'] = false;
  config._internal.pluginHistory['react-native-worklets'] = false;

  // Filter worklets plugins from config.plugins immediately
  if (config.plugins && Array.isArray(config.plugins)) {
    config.plugins = config.plugins.filter((plugin) => !isWorkletsPlugin(plugin));
  }

  // Merge plugins from app.json and config, prioritizing config plugins
  const getPluginName = (plugin) => (typeof plugin === 'string' ? plugin : (Array.isArray(plugin) && plugin[0]) ? plugin[0] : null);
  const appJsonPlugins = (appJson.expo.plugins || []).filter((plugin) => !isWorkletsPlugin(plugin));
  const configPlugins = config.plugins || [];

  const pluginMap = new Map();
  appJsonPlugins.forEach((plugin) => {
    const pluginName = getPluginName(plugin);
    if (pluginName && !isWorkletsPlugin(plugin)) pluginMap.set(pluginName, plugin);
  });
  configPlugins.forEach((plugin) => {
    const pluginName = getPluginName(plugin);
    if (pluginName && !isWorkletsPlugin(plugin)) pluginMap.set(pluginName, plugin);
  });

  // Ensure onesignal-expo-plugin exists
  if (!pluginMap.has('onesignal-expo-plugin')) {
    pluginMap.set('onesignal-expo-plugin', ['onesignal-expo-plugin', { mode: 'production' }]);
  }

  const allPlugins = Array.from(pluginMap.values());
  const filteredPlugins = allPlugins.filter((plugin) => !isWorkletsPlugin(plugin));

  // Build extra without forcing eas.projectId so EAS can re-init/link a new project.
  const extra = {
    ...appJson.expo.extra,
    ...config.extra,
    onesignal: {
      ...(appJson.expo?.extra?.onesignal || config.extra?.onesignal || {}),
      appId: ONESIGNAL_APP_ID || (appJson.expo?.extra?.onesignal?.appId || null),
    },
  };

  const android = {
    ...appJson.expo.android,
    ...config.android,
    package: config.android?.package || appJson.expo.android?.package || "com.ratlam.parcelbooking",
    usesCleartextTraffic: true,
    googleServicesFile: config.android?.googleServicesFile || appJson.expo.android?.googleServicesFile || "./google-services.json",
  };

  const sdkVersion = config.sdkVersion || appJson.expo.sdkVersion || "54.0.0";
  const runtimeVersion = appJson.expo.runtimeVersion || { policy: "appVersion" };

  const finalConfig = {
    ...config,
    owner: config.owner || appJson.expo.owner || "yashvardhansharma001",
    slug: config.slug || appJson.expo.slug || "parcelbooking",
    name: config.name || appJson.expo.name || "ParcelBooking",
    scheme: config.scheme || appJson.expo.scheme || "parcelbooking",
  };

  finalConfig.sdkVersion = sdkVersion;
  finalConfig.runtimeVersion = runtimeVersion;
  finalConfig.updates = {
    ...config.updates,
    ...appJson.expo.updates,
  };
  finalConfig.plugins = filteredPlugins;
  finalConfig.android = {
    ...android,
    package: android.package || "com.ratlam.parcelbooking",
  };
  finalConfig.extra = extra;
  finalConfig.ios = config.ios || appJson.expo.ios;
  finalConfig.web = config.web || appJson.expo.web;
  finalConfig._internal = {
    ...config._internal,
    pluginHistory: {
      ...config._internal?.pluginHistory,
      'react-native-worklets/plugin': false,
      'react-native-worklets': false,
    },
    isLegacyPlugin: false,
  };

  if (finalConfig.plugins) {
    finalConfig.plugins = finalConfig.plugins.filter((plugin) => !isWorkletsPlugin(plugin));
  }

  return finalConfig;
};
