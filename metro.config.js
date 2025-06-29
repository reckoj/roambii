const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Add resolver for async imports and Firebase compatibility
config.resolver = {
  ...config.resolver,
  sourceExts: [...(config.resolver.sourceExts || []), 'mjs', 'cjs'],
  assetExts: [...(config.resolver.assetExts || [])],
  // Firebase compatibility fix for Expo SDK 53
  unstable_enablePackageExports: false,
};

module.exports = withNativeWind(config, { input: "./app/global.css" });
