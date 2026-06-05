import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        voce: {
          // <alpha-value> enables opacity modifiers: bg-voce-indigo/10, ring-voce-indigo/20 etc.
          indigo:  "rgb(99 102 241 / <alpha-value>)",   // #6366F1 — brand accent
          teal:    "rgb(29 158 117 / <alpha-value>)",   // #1D9E75 — secondary
          purple:  "rgb(127 119 221 / <alpha-value>)",  // #7F77DD — legacy, kept for existing pages
          bg:      "#FAFAF8",
          navy:    "#0F172A",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "voce-wave": {
          "0%, 100%": { height: "4px" },
          "50%":       { height: "var(--wave-h, 24px)" },
        },
        "voce-ripple": {
          "0%":   { transform: "scale(1)",   opacity: "0.4" },
          "100%": { transform: "scale(1.8)", opacity: "0" },
        },
      },
      animation: {
        "wave-1": "voce-wave 0.9s ease-in-out infinite 0s",
        "wave-2": "voce-wave 0.9s ease-in-out infinite 0.12s",
        "wave-3": "voce-wave 0.9s ease-in-out infinite 0.24s",
        "wave-4": "voce-wave 0.9s ease-in-out infinite 0.12s",
        "wave-5": "voce-wave 0.9s ease-in-out infinite 0s",
        "ripple": "voce-ripple 1.4s ease-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
