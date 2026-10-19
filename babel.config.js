module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          // Explicit aliases only. A broad `root` search can rewrite bare
          // `require(".")` calls inside dependencies to the app root.
          extensions: [".js", ".jsx", ".ts", ".tsx"],
          alias: {
            "@": "./",
            "@components": "./src/components",
            "@constants": "./src/constants",
            "@domain": "./src/domain",
            "@hooks": "./src/hooks",
            "@locales": "./src/locales",
            "@providers": "./src/providers",
            "@services": "./src/services",
            "@stores": "./src/stores",
            "@apptypes": "./src/types",
            "@utils": "./src/utils",
            "@assets": "./assets",
          },
        },
      ],
    ],
  };
};
