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

// Force every `react` import in the native bundle to resolve to THIS app's
// nested copy (19.1.0). npm hoists a newer React to the root node_modules
// (pulled transitively by the web app's ^19 deps — react-dom, radix, etc.), and
// react-native itself is hoisted there too, so RN 0.81's bundled renderer's
// `require("react")` would otherwise resolve to the root 19.2.x instead of the
// 19.1.0 it's built against → "Invalid hook call".
//
// This MUST be a resolveRequest override, not extraNodeModules: Metro consults
// extraNodeModules only as a fallback when normal resolution fails, and normal
// resolution *succeeds* at the hoisted root — so the mapping never fires. A
// resolveRequest intercepts the request first and is the only way to guarantee a
// single copy.
//
// Pin ONLY react — not react-native. resolveRequest is global, so this rule
// already rewrites the `require("react")` *inside* the root react-native, which
// is all we need to unify the renderer. react-native has a single hoisted copy
// with no app-local counterpart, so pinning it would rewrite `react-native/…`
// (including RN internals like Libraries/Core/InitializeCore) to a nonexistent
// apps/mobile/node_modules/react-native and break resolution. Leave it to
// normal resolution, which finds the root copy.
const REACT = "react";
const reactDir = path.resolve(projectRoot, "node_modules/react");

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Match "react" exactly and its subpaths ("react/jsx-runtime", "react/…"),
  // but NOT unrelated packages that merely start with the name
  // ("react-native", "react-native-screens", "react-dom").
  if (moduleName === REACT || moduleName.startsWith(`${REACT}/`)) {
    const subpath = moduleName.slice(REACT.length); // "" or "/jsx-runtime"
    return context.resolveRequest(
      context,
      subpath ? `${reactDir}${subpath}` : reactDir,
      platform
    );
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
