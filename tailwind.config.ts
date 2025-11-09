import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        text: {
          default: "#1f1f1f",
          subtle: "#474747",
          danger: "#b1324f",
          success: "#467c36",
          "primary-action": "#ffffff",
          primary: "#324fb1",
        },
        background: {
          default: "#ffffff",
          subtle: "#f4f4f4",
          subtler: "#e0e0e0",
          danger: "#efd6dc",
          success: "#c0edb2",
          "primary-action": {
            enabled: "#3e63dd",
            hover: "#324fb1",
            pressed: "#253b85",
            disabled: "#757575",
          },
          "secondary-action": {
            enabled: "#ffffff",
            hover: "#eceffc",
            pressed: "#d8e0f8",
            disabled: "#9e9e9e",
          },
        },
        border: {
          default: "#757575",
          bold: "#474747",
          success: "#467c36",
          danger: "#b1324f",
        },
      },
      fontSize: {
        // Title
        "title-lg": ["48px", { lineHeight: "1.5", letterSpacing: "0.01em" }],
        "title-md": ["40px", { lineHeight: "1.5", letterSpacing: "0.02em" }],
        // Heading
        "heading-xl": ["32px", { lineHeight: "1.53", letterSpacing: "0.02em" }],
        "heading-lg": ["28px", { lineHeight: "1.57", letterSpacing: "0.02em" }],
        "heading-md": ["24px", { lineHeight: "1.67", letterSpacing: "0.03em" }],
        "heading-sm": ["20px", { lineHeight: "1.6", letterSpacing: "0.03em" }],
        "heading-xs": ["16px", { lineHeight: "1.75", letterSpacing: "0.03em" }],
        // Body
        "body-lg": ["20px", { lineHeight: "1.6", letterSpacing: "0.03em" }],
        "body-md": ["16px", { lineHeight: "1.75", letterSpacing: "0.03em" }],
        "body-sm": ["14px", { lineHeight: "1.71", letterSpacing: "0.03em" }],
        "body-xs": ["12px", { lineHeight: "1.67", letterSpacing: "0.04em" }],
        // Label
        "label-md": ["16px", { lineHeight: "1", letterSpacing: "0.03em" }],
        "label-sm": ["14px", { lineHeight: "1", letterSpacing: "0.03em" }],
        "label-xs": ["12px", { lineHeight: "1", letterSpacing: "0.04em" }],
      },
      spacing: {
        none: "0px",
        xxxs: "2px",
        xxs: "4px",
        xs: "8px",
        sm: "12px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        xxl: "64px",
      },
      borderRadius: {
        none: "0px",
        xs: "2px",
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        infinity: "999px",
      },
      borderWidth: {
        none: "0px",
        sm: "0.5px",
        md: "1px",
        lg: "2px",
      },
      boxShadow: {
        "elevation-2": "0px 2px 6px 0px rgba(0, 0, 0, 0.15)",
        "elevation-4": "0px 4px 10px 0px rgba(0, 0, 0, 0.15)",
        "elevation-8": "0px 8px 20px 0px rgba(0, 0, 0, 0.15)",
        "elevation-12": "0px 16px 30px 0px rgba(0, 0, 0, 0.15)",
      },
      fontFamily: {
        default: ['"BIZ UDPGothic"', "sans-serif"],
      },
      fontWeight: {
        normal: "400",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
export default config;
