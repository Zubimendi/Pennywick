module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Needed to inline .sql migration files at build time (Drizzle + Expo SQLite)
      ['inline-import', { extensions: ['.sql'] }],
      // Must be last — required by react-native-reanimated
      'react-native-reanimated/plugin',
    ],
  };
};
