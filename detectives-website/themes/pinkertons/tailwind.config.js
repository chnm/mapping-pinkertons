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
          bg: "#1c1f22", // Charcoal background (for hero/header/footer)
          'bg-light': "#f5f2e8", // Light background for content
          text: "#f5f2e8", // Light text (for dark backgrounds)
          'text-dark': "#2d3439", // Dark text (for light backgrounds)
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
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': theme('colors.grit["text-dark"]'),
            '--tw-prose-headings': theme('colors.grit["text-dark"]'),
            '--tw-prose-lead': theme('colors.grit["text-dark"] / 80%'),
            '--tw-prose-links': theme('colors.grit.steel'),
            '--tw-prose-bold': theme('colors.grit["text-dark"]'),
            '--tw-prose-counters': theme('colors.grit["text-dark"] / 60%'),
            '--tw-prose-bullets': theme('colors.grit["text-dark"] / 60%'),
            '--tw-prose-hr': theme('colors.grit.steel / 30%'),
            '--tw-prose-quotes': theme('colors.grit["text-dark"] / 80%'),
            '--tw-prose-quote-borders': theme('colors.grit.steel'),
            '--tw-prose-captions': theme('colors.grit["text-dark"] / 60%'),
            '--tw-prose-code': theme('colors.grit.accent'),
            '--tw-prose-pre-code': theme('colors.grit["text-dark"]'),
            '--tw-prose-pre-bg': theme('colors.gray.100'),
            '--tw-prose-th-borders': theme('colors.grit.steel / 30%'),
            '--tw-prose-td-borders': theme('colors.grit.steel / 20%'),
            // Base styles
            maxWidth: 'none',
            a: {
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline',
              },
            },
            h1: {
              fontFamily: theme('fontFamily.heading').join(', '),
            },
            h2: {
              fontFamily: theme('fontFamily.heading').join(', '),
            },
            h3: {
              fontFamily: theme('fontFamily.heading').join(', '),
            },
            h4: {
              fontFamily: theme('fontFamily.heading').join(', '),
            },
            code: {
              backgroundColor: theme('colors.gray.100'),
              padding: '0.25rem',
              borderRadius: '0.25rem',
              fontWeight: '400',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            pre: {
              backgroundColor: theme('colors.gray.100'),
              borderWidth: '1px',
              borderColor: theme('colors.gray.300'),
            },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
