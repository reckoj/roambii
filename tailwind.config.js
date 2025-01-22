/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        rubik: ["Rubik-Bold", "sans-serif"],
      },
      colors: {
        primary: {
          100: "#1ABC9C1A",
          200: "#1ABC9C8A",
          300: "#1ABC9C",
        },
        accent: { 100: "#D9D9D9", 200: "#D9D9D92A" },
        black: { DEFAULT: "#000000", 100: "#8C8E98" },
        text: "#34495E",
        danger: "#F75555",
        grey: "#95A5A6",
      },
    },
  },
  plugins: [],
};
