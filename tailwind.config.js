/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  themes: ["light", "dark", "sunset"],
  plugins: [
    require('daisyui'),
  ],
}