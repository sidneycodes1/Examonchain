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
        bg: "#060910",
        card: "#0a0f1a",
        border: "#1e2840",
        accent: "#00FFA3",
        purple: "#9945FF",
        blue: "#00C2FF",
      },
    },
  },
  plugins: [],
};
export default config;
