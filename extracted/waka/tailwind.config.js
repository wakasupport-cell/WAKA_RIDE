/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        waka: {
          bg: '#0F172A',
          card: '#1E293B',
          border: '#334155',
          muted: '#475569',
          'text-primary': '#F8FAFC',
          'text-muted': '#94A3B8',
          amber: '#F59E0B',
          orange: '#EA580C',
          success: '#22C55E',
          danger: '#EF4444',
          warning: '#F97316',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'amber-gradient': 'linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)',
        'card-gradient': 'linear-gradient(135deg, #1E293B 0%, #162032 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
