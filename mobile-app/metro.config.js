// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Désactiver les externals problématiques avec Node 24
config.resolver = {
  ...config.resolver,
  // Bloquer le module node:sea qui cause des problèmes
  blockList: [/node:sea/],
};

// Désactiver le require.context transformation qui pose problème
config.transformer = {
  ...config.transformer,
  unstable_allowRequireContext: false,
};

module.exports = config;
