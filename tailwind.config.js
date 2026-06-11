/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Emerald palette sampled from casebasix's UI (header timer pill,
        // section labels, accent bar).
        brand: {
          DEFAULT: "#1f8f57",
          dark: "#0f5132",
          mid: "#27a06a",
          light: "#41c97e",
          pale: "#bdeccd",
        },
      },
      fontFamily: {
        // Trebuchet (as used by casebasix), referencing the system font with
        // safe fallbacks rather than bundling font files.
        sans: ['"Trebuchet MS"', "Trebuchet", "Segoe UI", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
