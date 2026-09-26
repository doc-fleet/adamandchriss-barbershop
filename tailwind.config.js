module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./styles/**/*.{css}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f5f0ff",
          100: "#e9dce6",
          200: "#d4b8cd",
          300: "#c095b5",
          400: "#ac719c",
          500: "#8e4e7a",
          600: "#713a5c",
          700: "#532b43",
          800: "#351a2a",
          900: "#1a0d14",
        },
        gold: {
          50: "#fefce8",
          100: "#fef9c3",
          200: "#fef08a",
          300: "#fde047",
          400: "#facc15",
          500: "#eab308",
          600: "#ca8a04",
          700: "#a16207",
          800: "#824c06",
          900: "#713a03",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
