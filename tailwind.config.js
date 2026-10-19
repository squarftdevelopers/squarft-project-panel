/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        "manrope-medium": ["Manrope_500Medium"],
        "manrope-bold": ["Manrope_700Bold"],
        "inter-medium": ["Inter_500Medium"],
        "inter-semibold": ["Inter_600SemiBold"],
        "inter-bold": ["Inter_700Bold"],
        lato: ["Lato_400Regular"],
        "lato-light": ["Lato_300Light"],
        "lato-bold": ["Lato_700Bold"],
        "lato-black": ["Lato_900Black"],
      },
    },
  },
  plugins: [],
}