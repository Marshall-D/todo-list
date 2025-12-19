// tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],

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
          primary: "#0056B3",
          primaryLight: "#5286BE",
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
        // Dark-mode specific tokens (explicit group)
        brandDark: {
          // main surfaces
          bg: "#000000", // pure black root bg
          surface: "#071125", // slightly lighter than black, keeps navy tint
          // accents
          primary: "#0B6CB0", // primary accent on dark surfaces
          primaryLight: "#1A84C6",
          // subtle chrome
          border: "#1F2933",
          // text
          text: "#E6EEF8", // primary text (off-white, cool)
          textMuted: "#9AA6B2", // secondary text
          placeholder: "#6B7780",
          // feedback
          success: "#16A34A",
          successLight: "#064E2D",
          error: "#F87171",
          yellow: "#F59E0B",
          pink: "#3A2430",
        },
      },
    },
  },
  plugins: [],
};
