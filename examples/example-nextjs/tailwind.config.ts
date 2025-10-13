import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        dark: {
          bg: "#0f172a",
          card: "#1e293b",
          text: "#f1f5f9",
          muted: "#94a3b8",
          border: "#334155",
          accent: "#3b82f6",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
