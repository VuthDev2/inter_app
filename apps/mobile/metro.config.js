// Metro configuration for this app inside the npm workspace.
//
// Without this file Metro picked the workspace root (inter_app) as its server
// root, so it served the bundle at "/apps/mobile/index.bundle" while the native
// app asked for "/index.bundle". Metro answered 404, no JavaScript ever loaded,
// and the app launched to a black screen with no error anywhere.
//
// Pinning projectRoot to this directory makes the served path match what the app
// requests. watchFolders and nodeModulesPaths still cover the workspace root, so
// hoisted dependencies resolve normally.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Dependencies are hoisted to the workspace root, so Metro has to watch there.
config.watchFolders = [workspaceRoot];

// Look in this app first, then the hoisted root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Only use the paths above. Walking up the tree finds the same packages twice in
// a workspace, which is how two copies of react-native end up loaded and the app
// dies with "Tried to register two views with same name RNSScreen".
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
