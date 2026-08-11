import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        xl: "1rem",
        "2xl": "1.4rem",
      },
      fontFamily: {
        sans: ["Sora", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Playfair Display", "ui-serif", "Georgia", "serif"],
      },
      colors: {
        surface: "hsl(var(--surface))",
        text: "hsl(var(--text))",
      },
      boxShadow: {
        glass: "0 20px 50px -24px rgba(15, 23, 42, 0.45)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
