/**
 * ESLint plugin for jd-kit custom rules.
 *
 * Provides rules specific to jd-kit project conventions.
 */

import componentColocation from "./rules/component-colocation.js";

const plugin = {
  meta: {
    name: "eslint-plugin-jd-kit",
    version: "1.0.0",
  },
  rules: {
    "component-colocation": componentColocation,
  },
};

export default plugin;
