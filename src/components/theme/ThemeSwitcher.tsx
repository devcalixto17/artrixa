import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Palette } from "lucide-react";

type ThemeColor = "green" | "purple" | "light";

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
    const root = document.documentElement;

    root.style.setProperty("--primary", theme.primary);
    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--ring", theme.ring);
    root.style.setProperty("--neon-green", theme.neonGreen);
    root.style.setProperty("--neon-green-glow", theme.neonGreenGlow);
    root.style.setProperty("--sidebar-primary", theme.primary);
    root.style.setProperty("--sidebar-ring", theme.ring);

    // For light theme, also change background colors
    if (themeName === "light") {
      root.style.setProperty("--background", "0 0% 98%");
      root.style.setProperty("--foreground", "220 15% 15%");
      root.style.setProperty("--card", "0 0% 100%");
      root.style.setProperty("--card-foreground", "220 15% 15%");
      root.style.setProperty("--popover", "0 0% 100%");
      root.style.setProperty("--popover-foreground", "220 15% 15%");
      root.style.setProperty("--muted", "220 15% 92%");
      root.style.setProperty("--muted-foreground", "220 10% 40%");
      root.style.setProperty("--border", "220 15% 85%");
      root.style.setProperty("--input", "220 15% 90%");
      root.style.setProperty("--secondary", "220 15% 92%");
      root.style.setProperty("--secondary-foreground", "220 15% 15%");
      root.style.setProperty("--dark-surface", "0 0% 96%");
      root.style.setProperty("--darker-surface", "0 0% 94%");
      root.style.setProperty("--sidebar-background", "0 0% 98%");
      root.style.setProperty("--sidebar-foreground", "220 15% 15%");
      root.style.setProperty("--sidebar-accent", "220 15% 92%");
      root.style.setProperty("--sidebar-accent-foreground", "220 15% 15%");
      root.style.setProperty("--sidebar-border", "220 15% 85%");
    } else {
      // Dark theme colors
      root.style.setProperty("--background", "220 15% 8%");
      root.style.setProperty("--foreground", "60 10% 95%");
      root.style.setProperty("--card", "220 15% 12%");
      root.style.setProperty("--card-foreground", "60 10% 95%");
      root.style.setProperty("--popover", "220 15% 10%");
      root.style.setProperty("--popover-foreground", "60 10% 95%");
      root.style.setProperty("--muted", "220 15% 20%");
      root.style.setProperty("--muted-foreground", "220 10% 60%");
      root.style.setProperty("--border", "220 15% 20%");
      root.style.setProperty("--input", "220 15% 18%");
      root.style.setProperty("--secondary", "220 15% 18%");
      root.style.setProperty("--secondary-foreground", "60 10% 95%");
      root.style.setProperty("--dark-surface", "220 15% 10%");
      root.style.setProperty("--darker-surface", "220 15% 6%");
      root.style.setProperty("--sidebar-background", "220 15% 10%");
      root.style.setProperty("--sidebar-foreground", "60 10% 95%");
      root.style.setProperty("--sidebar-accent", "220 15% 18%");
      root.style.setProperty("--sidebar-accent-foreground", "60 10% 95%");
      root.style.setProperty("--sidebar-border", "220 15% 20%");
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
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          onClick={() => handleThemeChange("green")}
          className={`gap-2 ${currentTheme === "green" ? "bg-accent" : ""}`}
        >
          <div className="w-4 h-4 rounded-full" style={{ background: "hsl(90 100% 50%)" }} />
          Verde Neon
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleThemeChange("purple")}
          className={`gap-2 ${currentTheme === "purple" ? "bg-accent" : ""}`}
        >
          <div className="w-4 h-4 rounded-full" style={{ background: "hsl(270 100% 60%)" }} />
          Roxo Neon
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleThemeChange("light")}
          className={`gap-2 ${currentTheme === "light" ? "bg-accent" : ""}`}
        >
          <div className="w-4 h-4 rounded-full border" style={{ background: "white" }} />
          Claro
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};