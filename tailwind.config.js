/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#07080c',
        s1:      '#0c0e14',
        s2:      '#111420',
        s3:      '#161b28',
        s4:      '#1c2235',
        b1:      '#1e2640',
        b2:      '#263050',
        gold:    '#d4a84b',
        gold2:   '#f0c96a',
        exec:    '#60a5fa',
        bm:      '#f97316',
        dm:      '#a78bfa',
        staff:   '#94a3b8',
        acc:     '#34d399',
        hr:      '#f472b6',
        sola:    '#3b82f6',
        hawk:    '#ef4444',
        neven:   '#10b981',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        body:    ['Outfit', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
