module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 ships its Babel transform inside react-native-worklets.
    // Must stay last in the plugin list.
    plugins: ['react-native-worklets/plugin'],
  }
}
