/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class", // enable dark mode by toggling a .dark class
  theme: {
    extend: {
      // Optimize font families to match what we use
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'headings': ['Poppins', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
  // Production optimizations
  corePlugins: {
    // Disable unused features to reduce bundle size
    container: false,
    backdropBlur: false,
    backdropBrightness: false,
    backdropContrast: false,
    backdropGrayscale: false,
    backdropHueRotate: false,
    backdropInvert: false,
    backdropOpacity: false,
    backdropSaturate: false,
    backdropSepia: false,
  },
};