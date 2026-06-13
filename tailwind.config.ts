import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./hooks/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F2EDE3",
        panel: "#FBF7EF",
        ink: "#141111",
        aubergine: "#3A1628",
        clay: "#B76E58",
        sage: "#9DB8A2",
        powder: "#CBDDE7",
        line: "rgba(20,17,17,0.14)",
        muted: "rgba(20,17,17,0.62)",
        success: "#5E8C72",
        warning: "#B9824B",
        danger: "#8A2F24",
        consoleBg: "#171313",
        consoleText: "#F2EDE3",
        consoleAccent: "#CBDDE7"
      },
      fontFamily: {
        head: ["Norwester", "Space Grotesk", "Anton", "sans-serif"],
        body: ["Geist Sans", "Inter", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      borderRadius: { card: "24px", chip: "999px" }
    }
  },
  plugins: []
};
export default config;
