import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#09090B",
        surface: "#111113",
        border: "#1C1C1F",
        muted: "#27272A",
        accent: "#7C3AED",
        "accent-2": "#06B6D4",
        "accent-3": "#10B981",
        danger: "#EF4444",
        warning: "#F59E0B",
        text: { primary: "#FAFAFA", secondary: "#A1A1AA", muted: "#71717A" },
      },
      fontFamily: { mono: ["'JetBrains Mono'", "monospace"], sans: ["'Inter'", "sans-serif"] },
      animation: {
        "aurora": "aurora 8s ease infinite",
        "float": "float 6s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "shimmer": "shimmer 2s linear infinite",
        "typing": "typing 1.2s steps(3) infinite",
      },
      keyframes: {
        aurora: { "0%,100%": { backgroundPosition: "0% 50%" }, "50%": { backgroundPosition: "100% 50%" } },
        float: { "0%,100%": { transform: "translateY(0px)" }, "50%": { transform: "translateY(-20px)" } },
        glow: { from: { boxShadow: "0 0 20px #7C3AED40" }, to: { boxShadow: "0 0 40px #7C3AED80" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        typing: { "0%,100%": { content: "''" }, "33%": { content: "'▋'" }, "66%": { content: "'▋▋'" } },
      },
      backdropBlur: { xs: "2px" },
    },
  },
  plugins: [],
};
export default config;
