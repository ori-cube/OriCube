const config = {
  extends: ["gitmoji"],
  rules: {
    "header-max-length": [2, "always", 100],
    "type-case": [0, "always", "lower-case"],
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "improve",
        "update",
        "fix",
        "hotfix",
        "refactor",
        "delete",
        "style",
        "docs",
        "move",
        "test",
        "chore",
        "package",
        "WIP",
      ],
    ],
  },
};

module.exports = config;
