// metro.config.js — adds .sql source extension for Drizzle migration imports
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow importing raw SQL files (Drizzle migrations)
config.resolver.sourceExts.push('sql');

module.exports = config;
