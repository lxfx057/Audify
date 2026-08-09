/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}", "./lib/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#09090b",
        panel: "#111113",
        panel2: "#16161a",
        accent: "#ff2d55",
      },
      boxShadow: {
        glow: "0 0 30px rgba(255,45,85,0.22)",
      },
    },
  },
  plugins: [],
};
