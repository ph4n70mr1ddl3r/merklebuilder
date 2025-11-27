import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0b1018",
        panel: "rgba(255,255,255,0.04)",
        accent: "#30e0a1",
        accent2: "#ffb25a",
        danger: "#ff6b6b",
        muted: "#9bb0c7",
      },
      boxShadow: {
        glow: "0 20px 60px rgba(0, 0, 0, 0.3)",
      },
      borderRadius: {
        xl: "18px",
      },
    },
  },
  plugins: [],
};

export default config;
