import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Extracted directly from the official logo (client/public/logo.png) via
        // pixel-cluster analysis, not approximated by eye.
        forest: {
          DEFAULT: "#146440",
          dark: "#0E4A2F",
          light: "#1F8557",
        },
        sky: {
          DEFAULT: "#29A9E6",
          dark: "#1B84B8",
          light: "#6CC6F0",
        },
        gold: {
          DEFAULT: "#FCAD34",
          light: "#FDC670",
        },
        // Not present in the logo itself, kept as a secondary accent (footer band,
        // premium badges) from the original brand deck — see Pass 2 plan notes.
        maroon: {
          DEFAULT: "#5A1F35",
          dark: "#401526",
        },
        offwhite: "#F7F6F2",
        ink: "#1A1A1A",
      },
      fontFamily: {
        sans: ["Inter", "Poppins", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 4px 20px rgba(26, 26, 26, 0.08)",
        card: "0 2px 12px rgba(26, 26, 26, 0.06)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [typography],
};
