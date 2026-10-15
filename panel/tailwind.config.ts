import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Los de la marca, para que el panel no se vea ajeno al sitio.
        tinta: '#0B0B0A',
        panel: '#14120F',
        hueso: '#F4F0E6',
        oro: '#C9A227'
      }
    }
  },
  plugins: []
} satisfies Config;
