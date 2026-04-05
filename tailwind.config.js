/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-montserrat)', 'Montserrat', 'system-ui', 'sans-serif'],
      },
      colors: {
        'we-pink': '#e31c79',
        'we-pink-hover': '#cc1069',
        'we-gold': '#d3ad6b',
        'we-page': '#FAFAF8',
        'we-border': '#e8e4df',
        'we-border-light': '#f0ece7',
        'we-approved': '#2d9b6e',
        'we-warning': '#c4983a',
        'we-danger': '#b91c1c',
      },
    },
  },
  plugins: [],
}
