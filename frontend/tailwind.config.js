/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F8FAFC',
        cardBg: '#FFFFFF',
        sidebarBg: '#FFFFFF',
        borderCol: '#E2E8F0',
        navyDark: '#0B132B',
        navyHover: '#1C2541',
        accentBlue: '#2563EB',
        lightBlueBox: '#EBF4FF',
        lightBlueText: '#1E40AF',
        lightGreenPill: '#E8F7EE',
        lightGreenText: '#15803D',
        textDark: '#0F172A',
        textMuted: '#64748B'
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
      }
    },
  },
  plugins: [],
}
