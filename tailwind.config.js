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
        heading: ['SohneSchmal', 'system-ui', 'sans-serif'],
        body: ['Montserrat', 'system-ui', 'sans-serif'],
        sohne: ['SohneSchmal', 'system-ui', 'sans-serif'],
        montserrat: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      colors: {
        'we-pink': '#e31c79',
        'we-pink-hover': '#c91865',
        'we-navy': '#05202E',
        'we-gold': '#d3ad6b',
        'we-warm': '#a18b75',
        'we-bg': '#f8f9fa',
        // Legacy aliases
        'pink': '#e31c79',
        'dark-blue': '#05202E',
        'timesheet': '#e31c79',
        'expense': '#05202E',
      },
      borderRadius: {
        'we': '12px',
        'we-sm': '8px',
        'we-lg': '16px',
        'we-xl': '20px',
      },
      boxShadow: {
        'we-sm': '0 1px 3px rgba(0, 0, 0, 0.06)',
        'we-md': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'we-lg': '0 8px 24px rgba(0, 0, 0, 0.1)',
        'we-card': '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
        'we-card-hover': '0 8px 24px rgba(0, 0, 0, 0.08)',
      },
      transitionTimingFunction: {
        'we': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      animation: {
        'fade-up': 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fadeIn 0.3s ease both',
        'shimmer': 'shimmer 1.5s ease infinite',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
