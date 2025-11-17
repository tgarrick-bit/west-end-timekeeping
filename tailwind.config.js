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
        heading: ['var(--font-heading)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        sohne: ['var(--font-heading)', 'system-ui', 'sans-serif'],
        montserrat: ['var(--font-body)', 'system-ui', 'sans-serif'],
      // 🔥 NEW: use your custom OTF font for headers
      header: ['SohneSchmal', 'system-ui', 'sans-serif'],
    },
      colors: {
        'pink': '#e31c79',
        'dark-blue': '#05202E',
        'timesheet': '#e31c79',  // Alias for pink (for semantic naming)
        'expense': '#05202E',     // Alias for dark-blue (for semantic naming)
      },
    },
  },
  plugins: [],
}