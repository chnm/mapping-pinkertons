// tailwind.config.js
module.exports = {
  content: [
    "./layouts/**/*.html",
    "./content/**/*.md",
    "./content/**/*.html",
    "./static/**/*.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Oswald', 'sans-serif'],
        body: ['"EB Garamond"', 'serif'],
      },
      colors: {
        grit: {
          bg: "#1c1f22", // Charcoal background
          text: "#f5f2e8", // Ivory text
          accent: "#9c1b1b", // Crimson accent
          steel: "#44697d", // Gunmetal blue
          gold: "#d0a85c", // Aged gold

          /* Or... */
          // --rich-black: #000814ff;
          // --oxford-blue: #001d3dff;
          // --yale-blue: #003566ff;
          // --mikado-yellow: #ffc300ff;
          // --gold: #ffd60aff;
        },
      },
    },
  },
  plugins: [],
};
