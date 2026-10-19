/** @type {import("prettier").Config} */
const config = {
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 100,
  endOfLine: "lf",
  plugins: ["prettier-plugin-tailwindcss"],
  // Tailwind v4 has no JS config: point the class sorter at the CSS entry.
  tailwindStylesheet: "./src/app/globals.css",
};

export default config;
