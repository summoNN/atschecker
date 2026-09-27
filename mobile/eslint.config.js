// https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  ...expoConfig,
  globalIgnores(["node_modules/", ".expo/", "dist/", "babel.config.js"]),
  {
    settings: {
      react: {
        version: "19.2",
      },
    },
  },
]);
