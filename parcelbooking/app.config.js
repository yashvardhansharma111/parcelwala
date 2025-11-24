// app.config.js (REPLACEMENT)
// Safer, minimal app.config.js that enforces a valid android.package and filters worklets plugins.

const appJson = require('./app.json');

// Helper: detect worklets-related plugins
const isWorkletsPlugin = (plugin) => {
  if (!plugin) return false;
  try {
    const pluginName = typeof plugin === 'string' ? plugin : (Array.isArray(plugin) ? plugin[0] : null);
    if (!pluginName) return false;
    const name = String(pluginName).toLowerCase();
    return name.includes('worklets') || name.includes('react-native-worklets');
  } catch (e) {
    // if we can't determine, treat as non-worklets to avoid accidental exclusion
    return false;
  }
};

module.exports = function (config = {}) {
  // Environment / app.json / defaults
  const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || (appJson.expo?.extra?.onesignal?.appId) || null;
  const DEFAULT_PACKAGE = "com.ratlam.parcelbooking";

  // Resolve package with precedence: env var -> config.android.package -> app.json -> DEFAULT
  const envPackage = process.env.ANDROID_PACKAGE || process.env.EXPO_ANDROID_PACKAGE || null;
  const configPackageCandidate = config?.android?.package || null;
  const appJsonPackageCandidate = appJson?.expo?.android?.package || null;

  const isValidPackage = (p) => typeof p === 'string' && p.length > 0 && !p.includes('undefined');

  const chosenPackage = isValidPackage(envPackage)
    ? envPackage
    : isValidPackage(configPackageCandidate)
      ? configPackageCandidate
      : isValidPackage(appJsonPackageCandidate)
        ? appJsonPackageCandidate
        : DEFAULT_PACKAGE;

  // Merge and filter plugins (keep onesignal plugin present, remove worklets plugins)
  const getPluginName = (plugin) => (typeof plugin === 'string' ? plugin : (Array.isArray(plugin) && plugin[0]) ? plugin[0] : null);
  const appJsonPlugins = (appJson.expo?.plugins || []).filter((p) => !isWorkletsPlugin(p));
  const configPlugins = (config.plugins || []).filter((p) => !isWorkletsPlugin(p));

  const pluginMap = new Map();
  appJsonPlugins.forEach((p) => {
    const name = getPluginName(p);
    if (name) pluginMap.set(name, p);
  });
  configPlugins.forEach((p) => {
    const name = getPluginName(p);
    if (name) pluginMap.set(name, p);
  });

  if (!pluginMap.has('onesignal-expo-plugin')) {
    pluginMap.set('onesignal-expo-plugin', ['onesignal-expo-plugin', { mode: 'production' }]);
  }

  const filteredPlugins = Array.from(pluginMap.values()).filter((p) => !isWorkletsPlugin(p));

  // Build 'extra' merging app.json and config safely
  const extra = {
    ...(appJson.expo?.extra || {}),
    ...(config.extra || {}),
    onesignal: {
      ...(appJson.expo?.extra?.onesignal || config.extra?.onesignal || {}),
      appId: ONESIGNAL_APP_ID || (appJson.expo?.extra?.onesignal?.appId || null),
    },
  };

  // Build final config defensively
  const finalConfig = {
    // Spread config first so explicit values in config override app.json
    ...appJson.expo,
    ...config,
    // Don't force a hard-coded owner — use provided value or leave undefined
    owner: config.owner || appJson.expo?.owner || undefined,
    slug: config.slug || appJson.expo?.slug || 'parcelbooking',
    name: config.name || appJson.expo?.name || 'ParcelWallah',
    scheme: config.scheme || appJson.expo?.scheme || 'parcelbooking',
    sdkVersion: config.sdkVersion || appJson.expo?.sdkVersion || '54.0.0',
    runtimeVersion: config.runtimeVersion || appJson.expo?.runtimeVersion || (appJson.expo?.runtimeVersion || { policy: "appVersion" }),
    plugins: filteredPlugins,
    extra,
    // Ensure android object exists and package is enforced
    android: {
      ...(appJson.expo?.android || {}),
      ...(config.android || {}),
      package: chosenPackage,
      usesCleartextTraffic: (config.android?.usesCleartextTraffic ?? appJson.expo?.android?.usesCleartextTraffic ?? true),
      googleServicesFile: config.android?.googleServicesFile || appJson.expo?.android?.googleServicesFile || "./google-services.json",
    },
    ios: config.ios || appJson.expo?.ios,
    web: config.web || appJson.expo?.web,
    _internal: {
      ...(config._internal || {}),
      pluginHistory: {
        ...(config._internal?.pluginHistory || {}),
        'react-native-worklets/plugin': false,
        'react-native-worklets': false,
      },
      isLegacyPlugin: false,
    },
  };

  // safety: final sanity-check
  if (!finalConfig.android || !finalConfig.android.package || finalConfig.android.package.includes('undefined')) {
    finalConfig.android = finalConfig.android || {};
    finalConfig.android.package = DEFAULT_PACKAGE;
  }

  return finalConfig;
};
