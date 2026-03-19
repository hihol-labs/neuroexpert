import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#2563eb",
          light: "#3b82f6",
          dark: "#1d4ed8",
          cyan: "#22d3ee",
          purple: "#8b5cf6",
          bg: "#040714",
        },
      },
      borderRadius: {
        card: "12px",
        button: "8px",
      },
      spacing: {
        section: "4rem",
      },
    },
  },
  plugins: [],
};

export default config;
