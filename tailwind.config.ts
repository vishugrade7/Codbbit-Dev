
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
        mono: ["var(--font-source-code-pro)"],
        headline: ["var(--font-inter)"],
        body: ["var(--font-inter)"],
        code: ["var(--font-source-code-pro)"],
      },
      fontSize: {
        'xs': 'clamp(0.75rem, 0.65rem + 0.5vw, 0.875rem)',
        'sm': 'clamp(0.875rem, 0.75rem + 0.625vw, 1rem)',
        'base': 'clamp(1rem, 0.85rem + 0.75vw, 1.125rem)',
        'lg': 'clamp(1.125rem, 1rem + 0.625vw, 1.25rem)',
        'xl': 'clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem)',
        '2xl': 'clamp(1.5rem, 1.2rem + 1.5vw, 1.875rem)',
        '3xl': 'clamp(1.875rem, 1.5rem + 1.875vw, 2.25rem)',
        '4xl': 'clamp(2.25rem, 1.7rem + 2.75vw, 3rem)',
        '5xl': 'clamp(3rem, 2.25rem + 3.75vw, 3.75rem)',
        '6xl': 'clamp(3.75rem, 2.8rem + 4.75vw, 4.5rem)',
        '7xl': 'clamp(4.5rem, 3.4rem + 5.5vw, 6rem)',
        '8xl': 'clamp(6rem, 4.5rem + 7.5vw, 8rem)',
        '9xl': 'clamp(8rem, 6rem + 10vw, 10rem)',
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
        'marquee': {
          'from': { transform: 'translateX(0)' },
          'to': { transform: 'translateX(-100%)' },
        },
        'fade-in-up': {
          'from': { opacity: '0', transform: 'translateY(10px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        'gradient-bg': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
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
        'float': {
          '0%': { transform: 'translateY(0px) rotate(0deg)' },
          '25%': { transform: 'translateY(-15px) rotate(5deg)' },
          '50%': { transform: 'translateY(0px) rotate(0deg)' },
          '75%': { transform: 'translateY(15px) rotate(-5deg)' },
          '100%': { transform: 'translateY(0px) rotate(0deg)' },
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'points-animation': 'points-animation 2s ease-in-out forwards',
        'marquee': 'marquee 60s linear infinite',
        'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
        'gradient-bg': 'gradient-bg 10s ease infinite',
        'icon-wiggle': 'icon-wiggle 0.6s ease-in-out',
        'icon-flip': 'icon-flip 0.6s ease-in-out',
        'icon-pulse': 'icon-pulse 0.5s ease-in-out',
        'icon-shake': 'icon-shake 0.4s ease-in-out',
        'icon-bounce': 'icon-bounce 0.5s ease-in-out',
        'float': 'float 15s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
