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

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

module.exports = withNativeWind(config, { input: "./global.css" });
