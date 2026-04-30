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
          DEFAULT: '#f3ead8',
          warm:    '#f7f0de',  // raised card on paper
          soft:    '#ebe1c7'   // recessed surface (inputs, footer)
        },
        ink: {
          DEFAULT: '#1b1a17',
          soft:    '#3a362e',
          mute:    '#7a7264'
        },
        rule:    '#c9bea3',
        wine:    '#b23a5b',   // topic · Forum brand
        plum:    '#6f2f59',   // long-form
        teal:    '#3f8f9f',   // announcement
        moss:    '#6b8a4a',   // recommendation
        ochre:   '#e8a53a',   // highlight · neu
        sky:     '#b6d4db',   // info bg
        success: '#5a8a3a',   // approved
        warn:    '#c8881e',   // warning
        danger:  '#a83245',   // destructive
        info:    '#3a7282'    // info accent
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
        bricolage:  ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        instrument: ['"Instrument Serif"', 'Fraunces', 'Georgia', 'serif'],
        dmmono:     ['"DM Mono"', 'ui-monospace', 'monospace']
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