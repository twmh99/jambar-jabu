import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class", // ⚡️ Penting untuk toggle manual (mode gelap/terang)
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        jjred: "#ef1f1f", // warna custom kamu tetap ada
      },
    },
  },
  plugins: [],
};

export default config;
