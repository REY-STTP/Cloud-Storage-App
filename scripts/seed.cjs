require("dotenv/config");

require("ts-node").register({
  transpileOnly: true,
  skipProject: true,
  compilerOptions: {
    module: "CommonJS",
    moduleResolution: "node",
    target: "ES2019",
  },
});

require("./seedAdmin.ts");
