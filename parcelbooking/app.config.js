// app.config.js
const appJson = require('./app.json');

// CRITICAL: Prevent worklets plugin from being auto-detected
// Intercept require calls to prevent loading the worklets plugin
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
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
      return function() {
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
      return function() { return {}; };
    }
    throw error;
  }
};

// Helper function to check if a plugin is worklets-related
// This must be defined outside the function to be available early
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

  // CRITICAL: Prevent auto-detection by marking worklets as excluded in _internal
  if (!config._internal) {
    config._internal = {};
  }
  if (!config._internal.pluginHistory) {
    config._internal.pluginHistory = {};
  }
  // Explicitly exclude worklets plugin to prevent auto-detection
  config._internal.pluginHistory['react-native-worklets/plugin'] = false;
  config._internal.pluginHistory['react-native-worklets'] = false;

  // CRITICAL: Filter worklets plugins from config.plugins IMMEDIATELY
  // This must happen before any plugin evaluation
  if (config.plugins && Array.isArray(config.plugins)) {
    config.plugins = config.plugins.filter(plugin => !isWorkletsPlugin(plugin));
  }

  // Helper function to get plugin name
  const getPluginName = (plugin) => {
    if (typeof plugin === 'string') return plugin;
    if (Array.isArray(plugin) && plugin[0]) return plugin[0];
    return null;
  };

  // Merge plugins from app.json and config, prioritizing config plugins
  // config.plugins already filtered above, but filter app.json plugins too
  const appJsonPlugins = (appJson.expo.plugins || []).filter(plugin => !isWorkletsPlugin(plugin));
  const configPlugins = config.plugins || []; // Already filtered above

  // Create a map to track plugins by name to avoid duplicates
  const pluginMap = new Map();

  // Add app.json plugins first (already filtered)
  appJsonPlugins.forEach(plugin => {
    const pluginName = getPluginName(plugin);
    if (pluginName && !isWorkletsPlugin(plugin)) {
      pluginMap.set(pluginName, plugin);
    }
  });

  // Override with config plugins (config takes precedence, already filtered)
  configPlugins.forEach(plugin => {
    const pluginName = getPluginName(plugin);
    if (pluginName && !isWorkletsPlugin(plugin)) {
      pluginMap.set(pluginName, plugin);
    }
  });

  // Ensure onesignal-expo-plugin exists
  if (!pluginMap.has('onesignal-expo-plugin')) {
    pluginMap.set('onesignal-expo-plugin', ['onesignal-expo-plugin', { mode: 'production' }]);
  }

  // Convert back to array and filter out worklets one more time (safety check)
  const allPlugins = Array.from(pluginMap.values());
  const filteredPlugins = allPlugins.filter(plugin => !isWorkletsPlugin(plugin));

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
    package: config.android?.package || appJson.expo.android?.package || "com.parcelwala.package",
    usesCleartextTraffic: true,
    googleServicesFile: config.android?.googleServicesFile || appJson.expo.android?.googleServicesFile || "./google-services.json"
  };

  // Build the final config
  const finalConfig = {
    ...config,
    owner: config.owner || appJson.expo.owner || "yashvardhansharma001",
    slug: config.slug || appJson.expo.slug || "parcelbooking",
    name: config.name || appJson.expo.name || "ParcelBooking",
    scheme: config.scheme || appJson.expo.scheme || "parcelbooking",
    plugins: filteredPlugins,
    android: {
      ...android,
      package: android.package || "com.parcelwala.package",
    },
    extra,
    ios: config.ios || appJson.expo.ios,
    web: config.web || appJson.expo.web,
    // Prevent auto-detection of plugins by explicitly setting _internal
    _internal: {
      ...config._internal,
      pluginHistory: {
        ...config._internal?.pluginHistory,
        'react-native-worklets/plugin': false,
        'react-native-worklets': false,
      },
      // Disable auto-detection for worklets
      isLegacyPlugin: false,
    },
  };

  // Final safety check: ensure no worklets plugins slipped through
  if (finalConfig.plugins) {
    finalConfig.plugins = finalConfig.plugins.filter(plugin => !isWorkletsPlugin(plugin));
  }

  return finalConfig;
};
