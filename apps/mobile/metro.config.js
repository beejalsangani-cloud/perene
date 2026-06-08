// Metro config for an Expo app inside an npm-workspaces monorepo.
//   1. Watch the repo root so changes in packages/shared hot-reload.
//   2. Resolve modules from BOTH the app's node_modules and the hoisted root
//      node_modules (npm hoists most deps to the root; conflicting versions —
//      e.g. react/tailwind that differ from the web app — stay nested here).
//   3. Wrap with NativeWind so Tailwind classes compile from ./global.css.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch the repo root in ADDITION to Expo's defaults so packages/shared
// hot-reloads, without dropping any default watch folder.
config.watchFolders = [...(config.watchFolders ?? []), monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// The web app pins a newer React (Next.js) than Expo SDK 54, so npm keeps both:
// the app's copy nested here and the web's hoisted at the root. Force every
// react / react-native import in the native bundle to resolve to THIS app's
// copy — otherwise a root-hoisted package could pull the web's React and cause
// "Invalid hook call" / duplicate-renderer crashes.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  react: path.resolve(projectRoot, "node_modules/react"),
  "react-native": path.resolve(projectRoot, "node_modules/react-native"),
};

module.exports = withNativeWind(config, { input: "./global.css" });
