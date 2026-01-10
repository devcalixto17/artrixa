import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Palette } from "lucide-react";

type ThemeColor = "green" | "purple" | "light" | "cyanPurpleDark";

const themes = {
  green: {
    name: "Verde Neon",
    primary: "90 100% 50%",
    accent: "90 100% 50%",
    ring: "90 100% 50%",
    neonGreen: "90 100% 50%",
    neonGreenGlow: "90 100% 60%",
  },
  purple: {
    name: "Roxo Neon",
    primary: "270 100% 60%",
    accent: "270 100% 60%",
    ring: "270 100% 60%",
    neonGreen: "270 100% 60%",
    neonGreenGlow: "270 100% 70%",
  },
  light: {
    name: "Claro",
    primary: "220 90% 56%",
    accent: "220 90% 56%",
    ring: "220 90% 56%",
    neonGreen: "220 90% 56%",
    neonGreenGlow: "220 90% 66%",
  },
  cyanPurpleDark: {
    name: "Ciano & Roxo Neon",
    primary: "190 100% 50%",
    accent: "270 100% 60%",
    ring: "190 100% 55%",
    neonGreen: "270 100% 60%",
    neonGreenGlow: "270 100% 70%",
    background: "230 20% 7%",
    foreground: "0 0% 98%",
    card: "230 20% 10%",
    border: "270 100% 50%",
  },
};

export const ThemeSwitcher = () => {
  const [currentTheme, setCurrentTheme] = useState<ThemeColor>("green");

  useEffect(() => {
    const savedTheme = localStorage.getItem("site-theme") as ThemeColor;
    if (savedTheme && themes[savedTheme]) {
      setCurrentTheme(savedTheme);
      applyTheme(savedTheme);
    }
  }, []);

  const applyTheme = (themeName: ThemeColor) => {
    const theme = themes[themeName];
    const themeAny = theme as any; // 👈 cast seguro
    const root = document.documentElement;

    root.style.setProperty("--primary", theme.primary);
    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--ring", theme.ring);
    root.style.setProperty("--neon-green", theme.neonGreen);
    root.style.setProperty("--neon-green-glow", theme.neonGreenGlow);
    root.style.setProperty("--sidebar-primary", theme.primary);
    root.style.setProperty("--sidebar-ring", theme.ring);

    if (themeName === "light") {
      root.style.setProperty("--background", "0 0% 98%");
      root.style.setProperty("--foreground", "220 15% 15%");
      root.style.setProperty("--card", "0 0% 100%");
      root.style.setProperty("--card-foreground", "220 15% 15%");
      root.style.setProperty("--border", "220 15% 85%");
    } else {
      root.style.setProperty("--background", themeAny.background ?? "220 15% 8%");
      root.style.setProperty("--foreground", themeAny.foreground ?? "60 10% 95%");
      root.style.setProperty("--card", themeAny.card ?? "220 15% 12%");
      root.style.setProperty("--card-foreground", themeAny.foreground ?? "60 10% 95%");
      root.style.setProperty("--border", themeAny.border ?? "220 15% 20%");
    }
  };

  const handleThemeChange = (theme: ThemeColor) => {
    setCurrentTheme(theme);
    localStorage.setItem("site-theme", theme);
    applyTheme(theme);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed top-20 right-4 z-50 h-10 w-10 rounded-full shadow-lg border-2"
          style={{
            borderColor: `hsl(var(--primary))`,
            boxShadow: `0 0 10px hsl(var(--primary) / 0.3)`,
          }}
        >
          <Palette className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => handleThemeChange("green")}>
          <div className="w-4 h-4 rounded-full bg-[hsl(90_100%_50%)]" />
          Verde Neon
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleThemeChange("purple")}>
          <div className="w-4 h-4 rounded-full bg-[hsl(270_100%_60%)]" />
          Roxo Neon
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleThemeChange("cyanPurpleDark")}>
          <div
            className="w-4 h-4 rounded-full"
            style={{
              background:
                "linear-gradient(135deg, hsl(190 100% 50%), hsl(270 100% 60%))",
            }}
          />
          Ciano & Roxo
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleThemeChange("light")}>
          <div className="w-4 h-4 rounded-full border bg-white" />
          Claro
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
