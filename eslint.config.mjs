import { config } from "@remotion/eslint-config-flat";

export default [
  { ignores: ["**/artifacts/**", "**/dist/**", "**/coverage/**", "**/node_modules.broken/**", "**/out/**"] },
  ...config,
  {
    files: ["packages/story-engine/**/*.ts", ".agents/skills/**/*.ts"],
    rules: {"@remotion/non-pure-animation": "off"},
  },
];
