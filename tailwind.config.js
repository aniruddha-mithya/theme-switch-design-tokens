/** @type {import('tailwindcss').Config} */
import themeExtension from "./twConfig.json";
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: themeExtension,
  },
  plugins: [],
};
