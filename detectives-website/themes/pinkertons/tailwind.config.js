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
        body: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        serif: ['"EB Garamond"', 'Georgia', 'serif'],
      },
      colors: {
        grit: {
          bg: "#2e2015", // Warm brown (formerly charcoal #1c1f22)
          'bg-light': "#f5efe0", // Parchment (formerly cream #f5f2e8)
          text: "#f5efe0", // Parchment text (for dark backgrounds)
          'text-dark': "#2a1a0e", // Dark warm brown (for light backgrounds)
          accent: "#b5381e", // Rust/brick (formerly crimson #9c1b1b)
          steel: "#5d7a6b", // Warm sage (formerly gunmetal blue #44697d)
          gold: "#c8a04a", // Amber (formerly aged gold #d0a85c)
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
