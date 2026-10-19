/** @type {import("@commitlint/types").UserConfig} */
const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "refactor", "test", "docs", "chore", "build", "ci", "perf", "style"],
    ],
    "scope-enum": [
      2,
      "always",
      [
        "infra",
        "db",
        "access",
        "shell",
        "feed",
        "post",
        "upload",
        "extract",
        "verify",
        "explain",
        "publish",
        "translate",
        "totw",
        "search",
        "pwa",
        "ui",
        "ai",
        "deps",
        "ci",
      ],
    ],
    // Every commit is `type(scope): subject`.
    "scope-empty": [2, "never"],
  },
};

export default config;
