/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Your existing color palette from the original project
        primary: {
          teal: '#4b9aaa',      // Primary accent color
          DEFAULT: '#4b9aaa'
        },
        burgundy: {
          DEFAULT: '#814256',   // Headers, footers, emphasis
          dark: 'rgba(139, 66, 86, 0.855)'
        },
        gold: {
          DEFAULT: '#eccc6e',   // Primary background, contrast
          light: '#f9f9f9'
        },
        beige: {
          DEFAULT: '#aca89f',   // Secondary backgrounds
          light: '#c9c4b9',
          lighter: '#e8e0e0'
        },
        // Kiosk palette — mirrors src/styles/tokens.css. Tailwind classes
        // exist alongside the CSS custom properties so authors can pick whichever fits.
        paper: {
          DEFAULT: '#f4ede1',
          warm:    '#ece2d2',
          soft:    '#f9f4ea'
        },
        ink: {
          DEFAULT: '#1b1a17',
          soft:    '#3a352d',
          mute:    '#6b6358'
        },
        rule:    '#c8bfae',
        wine:    '#7a4256',
        plum:    '#6F2F59',
        teal:    '#4b9aaa',
        moss:    '#6aab8e',
        ochre:   '#d9b238',
        success: '#7a9e7f',
        warn:    '#d9b238',
        danger:  '#b04545'
      },
      fontFamily: {
        sans: [
          'Segoe UI',
          '-apple-system',
          'BlinkMacSystemFont',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'Fira Sans',
          'Droid Sans',
          'Helvetica Neue',
          'sans-serif'
        ],
        // Kiosk fonts — mirror tokens.css `--k-font-*`
        bricolage:  ['"Bricolage Grotesque"', 'Inter', 'system-ui', 'sans-serif'],
        instrument: ['"Instrument Serif"', 'Fraunces', 'Georgia', 'serif'],
        jetbrains:  ['"JetBrains Mono"', '"IBM Plex Mono"', 'ui-monospace', 'monospace']
      },
      borderRadius: {
        'standard': '4px',
        'medium': '5px',
        'avatar': '30px'
      },
      boxShadow: {
        'standard': '0px 0px 10px 0px rgba(0, 0, 0, 0.2)',
        'subtle': '0px 0px 5px 0px rgba(0, 0, 0, 0.1)',
        'input': '0px 0px 5px 0px #eccc6e'
      },
      backdropBlur: {
        'navbar': '4px'
      },
      maxWidth: {
        'container': '1200px',
        'container-lg': '1400px'
      },
      minHeight: {
        'card': '40vh'
      },
      screens: {
        'xs': '390px',
        'sm': '576px',
        'md': '768px',
        'lg': '900px',
        'xl': '1400px'
      },
      spacing: {
        'section': '4%',
        'card': '30px'
      },
      zIndex: {
        'navbar': '10'
      }
    }
  },
  plugins: []
}