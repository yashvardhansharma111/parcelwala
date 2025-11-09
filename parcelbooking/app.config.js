const appJson = require('./app.json');

module.exports = function (config) {
  // Filter out the worklets plugin if it's causing issues
  const plugins = config.plugins || [];
  const filteredPlugins = plugins.filter(plugin => {
    // Exclude worklets plugin if it's auto-detected
    if (typeof plugin === 'string' && plugin.includes('worklets')) {
      return false;
    }
    if (Array.isArray(plugin) && typeof plugin[0] === 'string' && plugin[0].includes('worklets')) {
      return false;
    }
    return true;
  });
  
  // Ensure extra.eas.projectId is always present from app.json
  const extra = {
    ...appJson.expo.extra,
    ...config.extra,
    eas: {
      ...appJson.expo.extra?.eas,
      ...config.extra?.eas,
      projectId: appJson.expo.extra?.eas?.projectId || config.extra?.eas?.projectId || "d6c7139a-de05-4408-8edf-5db1e53b983f",
    },
  };
  
  // Ensure android.package is preserved (required by EAS CLI)
  const android = {
    ...appJson.expo.android,
    ...config.android,
    package: config.android?.package || appJson.expo.android?.package || "com.ratlam.parcelbooking",
  };
  
  // Return config with filtered plugins, ensuring all required fields are present
  // Explicitly preserve all top-level fields that EAS CLI needs
  return {
    ...config,
    owner: "yashvardhansharma001", // Required by EAS CLI for dynamic configs
    plugins: filteredPlugins,
    android: {
      ...android,
      // Explicitly ensure package is set (EAS CLI requirement)
      package: android.package || "com.ratlam.parcelbooking",
    },
    extra,
    // Preserve other important fields
    ios: config.ios || appJson.expo.ios,
    web: config.web || appJson.expo.web,
  };
};

