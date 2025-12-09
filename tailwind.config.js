/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    " ./app/**/*.{js,jsx,ts,tsx}",
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        Jakarta: ["Jakarta", "sans-serif"],
        JakartaBold: ["Jakarta-Bold", "sans-serif"],
        JakartaExtraBold: ["Jakarta-ExtraBold", "sans-serif"],
        JakartaExtraLight: ["Jakarta-ExtraLight", "sans-serif"],
        JakartaLight: ["Jakarta-Light", "sans-serif"],
        JakartaMedium: ["Jakarta-Medium", "sans-serif"],
        JakartaSemiBold: ["Jakarta-SemiBold", "sans-serif"],
      },
      colors: {
        brand: {
          primary: "#7F1945",
          primaryLight: "#F1F4F3",
          border: "#CBD5E1",
          textDark: "#334155",
          textGray: "#4B5563",
          textGray2: "#F1F5F9",
          textGray3: "#64748B",
          placeholder: "#94A3B8",
          success: "#16A34A",
          successLight: "#BBF7D0",
          white: "#FFFFFF",
          black: "#000000",
          darkBlue: "#1F2937",
          grayBlue: "#E2E8F0",
          error: "#E11D48",
          pink: "#FFE0ED",
          yellow: "#F59E0B",
        },
      },
    },
  },
  plugins: [],
};
