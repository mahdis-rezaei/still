const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Phase 0.x: to reuse the repo's shared packages (@workspace/api-zod,
// @workspace/api-client-react), add the monorepo root to watchFolders and the
// root node_modules to nodeModulesPaths here.

module.exports = withNativeWind(config, { input: "./global.css" });
