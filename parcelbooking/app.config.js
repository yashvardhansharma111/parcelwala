// app.config.js
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

  // Build extra without forcing eas.projectId so EAS can re-init/link a new project.
  const extra = {
    ...appJson.expo.extra,
    ...config.extra,
    // Do NOT force eas.projectId here. Allow EAS to set it when initializing.
    // Keep other extra values if present.
  };

  // Ensure android.package is preserved (required by EAS CLI)
  const android = {
    ...appJson.expo.android,
    ...config.android,
    package: config.android?.package || appJson.expo.android?.package || "com.ratlam.parcelbooking",
    // Allow cleartext HTTP traffic for this APK (useful for dev / internal testing)
    usesCleartextTraffic: true,
  };

  // Return config with filtered plugins, ensuring all required fields are present
  return {
    ...config,
    owner: "yashvardhansharma001", // keep owner if required
    slug: "parcelbooking",         // <<< set the slug you want for the NEW project
    name: config.name || appJson.expo.name || "ParcelBooking",
    scheme: config.scheme || appJson.expo.scheme || "parcelbooking",
    plugins: filteredPlugins,
    android: {
      ...android,
      package: android.package || "com.ratlam.parcelbooking",
      // usesCleartextTraffic already set above
    },
    extra,
    ios: config.ios || appJson.expo.ios,
    web: config.web || appJson.expo.web,
  };
};
