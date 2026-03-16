import { base } from "./base.js";

export const server = [
  ...base,
  {
    rules: {
      "no-console": "off", // servers log by design
    },
  },
];
