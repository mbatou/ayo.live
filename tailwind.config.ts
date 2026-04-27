import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "ayo-gold": "#F59E0B",
        "ayo-gold-hover": "#D97706",
        "stage-black": "#0A0A0A",
        surface: "#1A1A1A",
        "surface-raised": "#242424",
        "live-red": "#EF4444",
        protected: "#22C55E",
        "text-primary": "#FFFFFF",
        "text-secondary": "#9CA3AF",
        "text-muted": "#6B7280",
        "border-subtle": "#2A2A2A",
      },
      fontFamily: {
        display: ["var(--font-display)", "Space Grotesk", "sans-serif"],
        body: ["var(--font-body)", "Inter", "sans-serif"],
      },
      borderRadius: {
        card: "12px",
        btn: "8px",
        badge: "4px",
      },
    },
  },
  plugins: [],
};
export default config;
