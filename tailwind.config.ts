import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--primary)",
        "primary-dark": "var(--primary-dark)",
        bg: "var(--bg)",
        surface: "var(--surface)",
        text: "var(--text)",
        accent: "var(--accent)",
        border: "var(--border)",
      },
      boxShadow: {
        card: "var(--card-shadow)",
        glow: "var(--glow)",
      },
      fontFamily: {
        fredoka: ["var(--font-fredoka)", "Fredoka", "sans-serif"],
        body: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      backgroundImage: {
        "theme-gradient":
          "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
      },
      minHeight: {
        touch: "48px",
      },
      minWidth: {
        touch: "48px",
      },
    },
  },
  plugins: [],
};

export default config;
