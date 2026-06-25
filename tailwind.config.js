/** @type {import('tailwindcss').Config} */
export default {
  // `class` strategy lets us toggle dark mode by adding `dark` to <html>.
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Friendly indigo/violet primary — warmer than a flat corporate blue.
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
        },
        // Warm secondary accent used in gradients/illustrations.
        grape: {
          400: "#c084fc",
          500: "#a855f7",
          600: "#9333ea",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        soft: "0 12px 32px -12px rgba(79, 70, 229, 0.22)",
        "soft-lg": "0 24px 60px -20px rgba(79, 70, 229, 0.30)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        // Opacity-only — must NOT use transform, or it creates a containing
        // block that breaks position:fixed for modals/toasts inside it.
        "fade-up": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        pop: {
          "0%": { transform: "scale(0.96)" },
          "60%": { transform: "scale(1.02)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "fade-up": "fade-up 0.4s ease-out both",
        pop: "pop 0.25s ease-out both",
      },
    },
  },
  plugins: [],
};
