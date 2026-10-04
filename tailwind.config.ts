import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: { DEFAULT: "1.25rem", md: "2rem", xl: "3rem" }, screens: { "2xl": "1440px" } },
    extend: {
      colors: {
        ink: "rgb(var(--ink) / <alpha-value>)",
        espresso: "rgb(var(--espresso) / <alpha-value>)",
        roast: "rgb(var(--roast) / <alpha-value>)",
        mocha: "rgb(var(--mocha) / <alpha-value>)",
        caramel: { DEFAULT: "rgb(var(--caramel) / <alpha-value>)", light: "rgb(var(--caramel-light) / <alpha-value>)" },
        cream: { DEFAULT: "rgb(var(--cream) / <alpha-value>)", dim: "rgb(var(--cream-dim) / <alpha-value>)" },
        foam: "rgb(var(--foam) / <alpha-value>)",
        stone: "rgb(var(--stone) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "display-2xl": ["clamp(3.5rem, 11vw, 11.5rem)", { lineHeight: "0.88", letterSpacing: "-0.03em" }],
        "display-xl": ["clamp(3rem, 8vw, 8rem)", { lineHeight: "0.92", letterSpacing: "-0.025em" }],
        "display-lg": ["clamp(2.5rem, 5.5vw, 5.25rem)", { lineHeight: "0.98", letterSpacing: "-0.02em" }],
        "display-md": ["clamp(2rem, 3.6vw, 3.25rem)", { lineHeight: "1.02", letterSpacing: "-0.015em" }],
        eyebrow: ["0.72rem", { lineHeight: "1", letterSpacing: "0.22em" }],
      },
      borderColor: { DEFAULT: "rgb(var(--cream) / 0.1)" },
      borderRadius: { xl2: "1.25rem" },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        "in-out-quart": "cubic-bezier(0.76, 0, 0.24, 1)",
      },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(14px)" }, "100%": { opacity: "1", transform: "none" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        "pulse-ring": { "0%": { transform: "scale(.8)", opacity: ".7" }, "100%": { transform: "scale(2.2)", opacity: "0" } },
        draw: { "0%": { strokeDashoffset: "1" }, "100%": { strokeDashoffset: "0" } },
        steam: { "0%": { transform: "translateY(0) scaleX(1)", opacity: "0" }, "40%": { opacity: ".5" }, "100%": { transform: "translateY(-28px) scaleX(1.6)", opacity: "0" } },
      },
      animation: {
        "fade-up": "fade-up .7s cubic-bezier(0.16,1,0.3,1) both",
        shimmer: "shimmer 1.6s infinite",
        "pulse-ring": "pulse-ring 1.8s cubic-bezier(0.16,1,0.3,1) infinite",
        steam: "steam 3.2s ease-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
