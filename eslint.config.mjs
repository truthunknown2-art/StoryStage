import { config } from "@remotion/eslint-config-flat";

export default [
  {
    ignores: [
      "**/artifacts/**",
      "**/dist/**",
      "**/coverage/**",
      "**/node_modules.broken/**",
      "**/out/**",
      "**/output/playwright/**",
    ],
  },
  ...config,
  {
    files: ["packages/story-engine/**/*.ts", ".agents/skills/**/*.ts"],
    rules: { "@remotion/non-pure-animation": "off" },
  },
  {
    files: ["apps/studio/**/*.{ts,tsx}"],
    rules: { "@remotion/non-pure-animation": "off" },
  },
  {
    files: [
      "packages/story-engine/src/director/**/*.{ts,tsx}",
      "packages/remotion-runtime/src/director/**/*.{ts,tsx}",
      "apps/studio/src/director/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "**/cv001-*",
            "**/kids-showcase*",
            "**/pipeline",
            "**/animation-compiler",
          ],
        },
      ],
    },
  },
];
