const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Add resolver for async imports
config.resolver = {
  ...config.resolver,
  sourceExts: [...(config.resolver.sourceExts || []), 'mjs', 'cjs'],
  assetExts: [...(config.resolver.assetExts || [])]
};

module.exports = withNativeWind(config, { input: "./app/global.css" });
