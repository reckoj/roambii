module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      [
        "module-resolver",
        {
          alias: {
            // This is needed for the @react-native-community/datetimepicker to work on Android
            "@react-native-community/datetimepicker": "@react-native-community/datetimepicker/src/index.js",
          },
        },
      ],
    ],
  };
};
