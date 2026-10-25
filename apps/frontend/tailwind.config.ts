import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      // Restrained brutalist palette: paper, ink, chartreuse, and muted signals.
      colors: {
        cream:   '#F3F1E9',
        black:   '#111111',
        yellow:  '#D9F342',
        lavender:'#D6D2C8',
        coral:   '#D84B36',
        mint:    '#D8DED0',
        blue:    '#D5DEE1',
        border:   'hsl(var(--border))',
        input:    'hsl(var(--input))',
        ring:     'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      fontFamily: {
        heading: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body:    ['"Inter"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0px',
        sm:  '0px',
        md:  '0px',
        lg:  '0px',
        xl:  '0px',
        full: '0px',
      },
      boxShadow: {
        // True Light Neo-Brutalist offset hard-edge shadows (black ink block drop)
        neo: '3px 3px 0px #111111',
        'neo-sm': '2px 2px 0px #111111',
        'neo-xs': '1.5px 1.5px 0px #111111',
        'neo-md': '4px 4px 0px #111111',
        'neo-lg': '6px 6px 0px #111111',
        'neo-yellow': '3px 3px 0px #D9F342',
        'neo-coral': '3px 3px 0px #D84B36',
        'neo-mint': '3px 3px 0px #D8DED0',
        'neo-lavender': '3px 3px 0px #D6D2C8',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-sm':  'bounce-sm 1s infinite',
      },
    },
  },
  plugins: [],
};

export default config;
