import type { Config } from "tailwindcss";
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../../shared/auth/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
      colors: {
        primary: {
          DEFAULT: "#6366f1",
          foreground: "#ffffff",
          hover: "#4f46e5",
        },
        accent: { DEFAULT: "#f59e0b", foreground: "#1c1917" },
        success: "#10b981",
        warning: "#f97316",
        danger: "#ef4444",
      },
    },
  },
  plugins: [],
} satisfies Config;
