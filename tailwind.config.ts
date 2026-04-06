import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class",
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ["var(--font-sans)", "system-ui", "sans-serif"],
                serif: ["Georgia", "serif"],
            },
            colors: {
                // Claude Design System Colors
                background: "var(--background)",
                foreground: "var(--foreground)",
                card: {
                    DEFAULT: "var(--card)",
                    foreground: "var(--card-foreground)",
                },
                popover: {
                    DEFAULT: "var(--popover)",
                    foreground: "var(--popover-foreground)",
                },
                primary: {
                    DEFAULT: "var(--primary)",
                    foreground: "var(--primary-foreground)",
                },
                secondary: {
                    DEFAULT: "var(--secondary)",
                    foreground: "var(--secondary-foreground)",
                },
                muted: {
                    DEFAULT: "var(--muted)",
                    foreground: "var(--muted-foreground)",
                },
                accent: {
                    DEFAULT: "var(--accent)",
                    foreground: "var(--accent-foreground)",
                    hover: "var(--accent-hover)",
                    muted: "var(--accent-muted)",
                },
                destructive: {
                    DEFAULT: "var(--destructive)",
                    foreground: "var(--destructive-foreground)",
                },
                surface: {
                    base: "var(--surface-base)",
                    raised: "var(--surface-raised)",
                    overlay: "var(--surface-overlay)",
                    sunken: "var(--surface-sunken)",
                },
                content: {
                    primary: "var(--content-primary)",
                    secondary: "var(--content-secondary)",
                    tertiary: "var(--content-tertiary)",
                    inverse: "var(--content-inverse)",
                },
                border: {
                    DEFAULT: "var(--border)",
                    default: "var(--border-default)",
                    subtle: "var(--border-subtle)",
                    strong: "var(--border-strong)",
                },
                input: "var(--input)",
                ring: "var(--ring)",
                // Claude-specific colors
                terracotta: "#c96442",
                "terracotta-hover": "#b55537",
                parchment: "#f5f4ed",
                ivory: "#faf9f5",
                "warm-sand": "#e8e6dc",
                "border-cream": "#f0eee6",
                "anthropic-black": "#141413",
                "olive-gray": "#5e5d59",
                "stone-gray": "#87867f",
                "warm-silver": "#b0aea5",
                "charcoal-warm": "#4d4c48",
            },
            borderRadius: {
                none: "0",
                sm: "4px",
                DEFAULT: "8px", /* Comfortably rounded */
                md: "8px",
                lg: "12px", /* Generously rounded */
                xl: "16px", /* Very rounded */
                "2xl": "24px", /* Highly rounded */
                "3xl": "32px", /* Maximum rounded */
                full: "9999px",
            },
            keyframes: {
                corpusFloat: {
                    "0%, 100%": { transform: "translate(0, 0)", opacity: "0.35" },
                    "50%": { transform: "translate(12px, -18px)", opacity: "0.85" },
                },
                "ring-glow": {
                    "0%, 100%": { boxShadow: "0px 0px 0px 1px var(--border)" },
                    "50%": { boxShadow: "0px 0px 0px 2px var(--border-strong)" },
                },
            },
            animation: {
                corpusFloat: "corpusFloat 24s ease-in-out infinite",
                "ring-glow": "ring-glow 2s ease-in-out infinite",
            },
        },
    },
    plugins: [],
};

export default config;
