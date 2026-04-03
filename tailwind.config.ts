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
                sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
            },
            colors: {
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
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            keyframes: {
                corpusFloat: {
                    "0%, 100%": { transform: "translate(0, 0)", opacity: "0.35" },
                    "50%": { transform: "translate(12px, -18px)", opacity: "0.85" },
                },
            },
            animation: {
                corpusFloat: "corpusFloat 24s ease-in-out infinite",
            },
        },
    },
    plugins: [],
};

export default config;
