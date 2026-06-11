/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Forest-green palette matching casebasix (its documented chart colours).
        brand: {
          DEFAULT: "#1f7a4d",
          dark: "#12401c",
          mid: "#267a56",
          light: "#35c261",
          pale: "#acf1b8",
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
