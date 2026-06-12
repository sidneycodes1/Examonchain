import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg': '#0D0D0D',
        'surface': '#1A1A1A',
        'border': '#2A2A2A',
        'text-primary': '#F5F5F7',
        'text-secondary': '#A0A0A0',
        'accent': '#00C896',
        'accent-hover': '#00A876',
        'accent-light': '#E8F8F3',
        'error': '#FF3B30',
        'warning': '#FFB800',
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '32px',
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
export default config
