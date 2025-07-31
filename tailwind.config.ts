
import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)"],
        headline: ["var(--font-poppins)"],
        code: ["var(--font-source-code-pro)"],
      },
      fontSize: {
        'xs': '0.7rem',
        'sm': '0.8rem',
        'base': '0.9rem',
        'lg': '1rem',
        'xl': '1.125rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        '4xl': '1.875rem',
        '5xl': '2.25rem',
        '6xl': '3rem',
        '7xl': '3.75rem',
        '8xl': '4.5rem',
        '9xl': '6rem',
      },
      backgroundImage: {
        'podium-gradient-gold': 'linear-gradient(to bottom, hsl(var(--chart-3)), transparent)',
        'podium-gradient-silver': 'linear-gradient(to bottom, hsl(var(--muted-foreground)), transparent)',
        'podium-gradient-bronze': 'linear-gradient(to bottom, hsl(var(--chart-5)), transparent)',
        'shimmer': 'linear-gradient(110deg, transparent 20%, hsl(var(--primary)/0.1), transparent 80%)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'points-animation': {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '50%': { transform: 'scale(1.2)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '0' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        'fade-in-up': {
          'from': { opacity: '0', transform: 'translateY(10px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        'icon-wiggle': {
          '0%': { transform: 'rotate(0)' },
          '25%': { transform: 'rotate(-10deg)' },
          '50%': { transform: 'rotate(10deg) scale(1.1)' },
          '75%': { transform: 'rotate(-5deg)' },
          '100%': { transform: 'rotate(0)' },
        },
        'icon-flip': {
            '0%': { transform: 'perspective(200px) rotateY(0deg)' },
            '50%': { transform: 'perspective(200px) rotateY(-25deg) scale(1.1)' },
            '100%': { transform: 'perspective(200px) rotateY(0deg)' },
        },
        'icon-pulse': {
            '50%': { transform: 'scale(1.2)' },
        },
        'icon-shake': {
            '0%, 100%': { transform: 'translateX(0)' },
            '25%': { transform: 'translateX(-2px) rotate(-2deg)' },
            '75%': { transform: 'translateX(2px) rotate(2deg)' },
        },
        'icon-bounce': {
            '0%, 100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(-4px) scale(1.1)' },
        },
        'bg-shine': {
          'from': { backgroundPosition: '200% 0' },
          'to': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'points-animation': 'points-animation 2s ease-in-out forwards',
        'marquee': 'marquee 60s linear infinite',
        'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
        'icon-wiggle': 'icon-wiggle 0.6s ease-in-out',
        'icon-flip': 'icon-flip 0.6s ease-in-out',
        'icon-pulse': 'icon-pulse 0.5s ease-in-out',
        'icon-shake': 'icon-shake 0.4s ease-in-out',
        'icon-bounce': 'icon-bounce 0.5s ease-in-out',
        'bg-shine': 'bg-shine 3s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
