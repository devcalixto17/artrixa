import { useState, useEffect, useRef, useCallback } from "react";
import { Palette, Check } from "lucide-react";

type ThemeColor = "green" | "purple" | "light" | "cyanPurpleDark" | "dark";

interface ThemeConfig {
  name: string;
  primary: string;
  accent: string;
  ring: string;
  neonGreen: string;
  neonGreenGlow: string;
  // optional surface overrides (HSL strings)
  background?: string;
  foreground?: string;
  card?: string;
  cardForeground?: string;
  border?: string;
  popover?: string;
  popoverForeground?: string;
  muted?: string;
  mutedForeground?: string;
  accentForeground?: string;
  primaryForeground?: string;
  input?: string;
  secondaryForeground?: string;
  destructiveForeground?: string;
  sidebarBackground?: string;
  sidebarForeground?: string;
  sidebarBorder?: string;
  darkSurface?: string;
  darkerSurface?: string;
  // swatch used in the menu
  swatch: string;
  swatchBorder?: string;
}

/** Fundo preto total compartilhado por todos os temas escuros. */
const BLACK_SURFACE = {
  background: "0 0% 3%",
  foreground: "0 0% 98%",
  card: "0 0% 7%",
  cardForeground: "0 0% 96%",
  border: "0 0% 16%",
  popover: "0 0% 6%",
  popoverForeground: "0 0% 96%",
  muted: "0 0% 12%",
  mutedForeground: "0 0% 68%",
  input: "0 0% 12%",
  secondaryForeground: "0 0% 96%",
  destructiveForeground: "0 0% 98%",
  sidebarBackground: "0 0% 5%",
  sidebarForeground: "0 0% 96%",
  sidebarBorder: "0 0% 16%",
  darkSurface: "0 0% 8%",
  darkerSurface: "0 0% 2%",
} as const;

const themes: Record<ThemeColor, ThemeConfig> = {
  green: {
    name: "Verde Neon",
    primary: "90 100% 50%",
    accent: "90 100% 50%",
    ring: "90 100% 50%",
    neonGreen: "90 100% 50%",
    neonGreenGlow: "90 100% 60%",
    ...BLACK_SURFACE,
    primaryForeground: "0 0% 4%",
    accentForeground: "0 0% 4%",
    swatch: "hsl(90 100% 50%)",
  },
  purple: {
    name: "Roxo Neon",
    primary: "270 100% 60%",
    accent: "270 100% 60%",
    ring: "270 100% 60%",
    neonGreen: "270 100% 60%",
    neonGreenGlow: "270 100% 70%",
    ...BLACK_SURFACE,
    primaryForeground: "0 0% 98%",
    accentForeground: "0 0% 98%",
    swatch: "hsl(270 100% 60%)",
  },
  cyanPurpleDark: {
    name: "Ciano & Roxo",
    primary: "190 100% 50%",
    accent: "270 100% 60%",
    ring: "270 100% 60%",
    neonGreen: "270 100% 60%",
    neonGreenGlow: "270 100% 70%",
    ...BLACK_SURFACE,
    border: "270 85% 52%",
    input: "270 35% 16%",
    muted: "270 25% 14%",
    mutedForeground: "270 25% 72%",
    sidebarBorder: "270 85% 52%",
    primaryForeground: "0 0% 4%",
    accentForeground: "0 0% 98%",
    swatch: "linear-gradient(135deg, hsl(190 100% 50%), hsl(270 100% 60%))",
  },
  dark: {
    name: "Dark (Preto)",
    primary: "0 85% 55%",
    accent: "0 85% 55%",
    ring: "0 85% 55%",
    neonGreen: "0 85% 55%",
    neonGreenGlow: "0 90% 62%",
    background: "0 0% 3%",
    foreground: "0 0% 98%",
    card: "0 0% 7%",
    cardForeground: "0 0% 96%",
    border: "0 0% 16%",
    popover: "0 0% 6%",
    popoverForeground: "0 0% 96%",
    muted: "0 0% 12%",
    mutedForeground: "0 0% 68%",
    accentForeground: "0 0% 98%",
    primaryForeground: "0 0% 98%",
    input: "0 0% 12%",
    secondaryForeground: "0 0% 96%",
    destructiveForeground: "0 0% 98%",
    sidebarBackground: "0 0% 5%",
    sidebarForeground: "0 0% 96%",
    sidebarBorder: "0 0% 16%",
    darkSurface: "0 0% 8%",
    darkerSurface: "0 0% 2%",
    swatch: "linear-gradient(135deg, #000000 50%, hsl(0 85% 55%) 50%)",
    swatchBorder: "#000000",
  },
  light: {
    name: "Claro",
    primary: "215 95% 55%",
    accent: "215 95% 55%",
    ring: "215 95% 55%",
    neonGreen: "215 95% 55%",
    neonGreenGlow: "215 95% 65%",
    swatch: "#ffffff",
  },
};

const DRAG_THRESHOLD = 5; // px before a press becomes a drag
const EDGE_MARGIN = 12; // distance from the viewport edge when snapped
const BTN_SIZE = 44;

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

  if (themeName === "light") {
    root.style.setProperty("--background", "0 0% 98%");
    root.style.setProperty("--foreground", "220 15% 15%");
    root.style.setProperty("--card", "0 0% 100%");
    root.style.setProperty("--card-foreground", "220 15% 15%");
    root.style.setProperty("--border", "220 15% 85%");
    root.style.setProperty("--popover", "0 0% 100%");
    root.style.setProperty("--popover-foreground", "220 15% 15%");
    root.style.setProperty("--muted", "0 0% 95%");
    root.style.setProperty("--muted-foreground", "220 15% 25%");
    root.style.setProperty("--accent-foreground", "220 15% 15%");
    root.style.setProperty("--primary-foreground", "220 15% 15%");
    root.style.setProperty("--input", "0 0% 98%");
    root.style.setProperty("--sidebar-background", "0 0% 98%");
    root.style.setProperty("--sidebar-foreground", "220 15% 15%");
    root.style.setProperty("--sidebar-accent-foreground", "220 15% 15%");
    root.style.setProperty("--sidebar-border", "220 15% 85%");
    root.style.setProperty("--secondary-foreground", "220 15% 15%");
    root.style.setProperty("--destructive-foreground", "220 15% 15%");
    root.style.setProperty("--dark-surface", "0 0% 96%");
    root.style.setProperty("--darker-surface", "0 0% 93%");
  } else {
    root.style.setProperty("--background", theme.background ?? "220 15% 8%");
    root.style.setProperty("--foreground", theme.foreground ?? "60 10% 95%");
    root.style.setProperty("--card", theme.card ?? "220 15% 12%");
    root.style.setProperty("--card-foreground", theme.cardForeground ?? theme.foreground ?? "60 10% 95%");
    root.style.setProperty("--border", theme.border ?? "220 15% 20%");
    root.style.setProperty("--popover", theme.popover ?? "220 15% 10%");
    root.style.setProperty("--popover-foreground", theme.popoverForeground ?? "60 10% 95%");
    root.style.setProperty("--muted", theme.muted ?? "220 15% 20%");
    root.style.setProperty("--muted-foreground", theme.mutedForeground ?? "220 10% 60%");
    root.style.setProperty("--accent-foreground", theme.accentForeground ?? "220 15% 8%");
    root.style.setProperty("--primary-foreground", theme.primaryForeground ?? "220 15% 8%");
    root.style.setProperty("--input", theme.input ?? "220 15% 18%");
    root.style.setProperty("--sidebar-background", theme.sidebarBackground ?? "220 15% 10%");
    root.style.setProperty("--sidebar-foreground", theme.sidebarForeground ?? "60 10% 95%");
    root.style.setProperty("--sidebar-border", theme.sidebarBorder ?? "220 15% 20%");
    root.style.setProperty("--secondary-foreground", theme.secondaryForeground ?? "60 10% 95%");
    root.style.setProperty("--destructive-foreground", theme.destructiveForeground ?? "60 10% 95%");
    root.style.setProperty("--dark-surface", theme.darkSurface ?? "220 15% 10%");
    root.style.setProperty("--darker-surface", theme.darkerSurface ?? "220 15% 6%");
  }

  root.setAttribute("data-theme", themeName);
};

const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

const getDefaultPosition = () => ({
  x: window.innerWidth - BTN_SIZE - EDGE_MARGIN,
  y: Math.round(window.innerHeight * 0.25),
});

export const ThemeSwitcher = () => {
  const [currentTheme, setCurrentTheme] = useState<ThemeColor>("green");
  const [menuOpen, setMenuOpen] = useState(false);
  const [position, setPosition] = useState(() => ({ x: 0, y: 80 }));
  const [dragging, setDragging] = useState(false);
  const [mounted, setMounted] = useState(false);

  const dragInfo = useRef({
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: false,
    pointerId: 0,
  });
  const justDragged = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Apply saved theme + position on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("site-theme") as ThemeColor;
    if (savedTheme && themes[savedTheme]) {
      setCurrentTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      applyTheme("dark");
      setCurrentTheme("dark");
    }

    let initial = getDefaultPosition();
    const savedPos = localStorage.getItem("theme-switcher-pos");
    if (savedPos) {
      try {
        const parsed = JSON.parse(savedPos);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          initial = parsed;
        }
      } catch {
        /* ignore */
      }
    }
    initial.x = clamp(initial.x, EDGE_MARGIN, window.innerWidth - BTN_SIZE - EDGE_MARGIN);
    initial.y = clamp(initial.y, EDGE_MARGIN, window.innerHeight - BTN_SIZE - EDGE_MARGIN);
    setPosition(initial);
    setMounted(true);
  }, []);

  // Keep the button inside the viewport on resize
  useEffect(() => {
    const onResize = () => {
      setPosition((prev) => ({
        x: clamp(prev.x, EDGE_MARGIN, window.innerWidth - BTN_SIZE - EDGE_MARGIN),
        y: clamp(prev.y, EDGE_MARGIN, window.innerHeight - BTN_SIZE - EDGE_MARGIN),
      }));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const info = dragInfo.current;
    const dx = e.clientX - info.startX;
    const dy = e.clientY - info.startY;

    if (!info.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      info.moved = true;
      setDragging(true);
      setMenuOpen(false);
    }

    if (info.moved) {
      const x = clamp(info.originX + dx, EDGE_MARGIN, window.innerWidth - BTN_SIZE - EDGE_MARGIN);
      const y = clamp(info.originY + dy, EDGE_MARGIN, window.innerHeight - BTN_SIZE - EDGE_MARGIN);
      setPosition({ x, y });
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);

    const info = dragInfo.current;
    if (info.moved) {
      justDragged.current = true;
      setDragging(false);
      // Snap horizontally to the nearest edge (left/right border)
      setPosition((prev) => {
        const center = prev.x + BTN_SIZE / 2;
        const snapToRight = center > window.innerWidth / 2;
        const x = snapToRight
          ? window.innerWidth - BTN_SIZE - EDGE_MARGIN
          : EDGE_MARGIN;
        const y = clamp(prev.y, EDGE_MARGIN, window.innerHeight - BTN_SIZE - EDGE_MARGIN);
        const next = { x, y };
        localStorage.setItem("theme-switcher-pos", JSON.stringify(next));
        return next;
      });
      // Allow a click after drag once the synthetic click is swallowed
      setTimeout(() => {
        justDragged.current = false;
      }, 0);
    }
  }, [handlePointerMove]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const info = dragInfo.current;
    info.startX = e.clientX;
    info.startY = e.clientY;
    info.originX = position.x;
    info.originY = position.y;
    info.moved = false;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handleClick = () => {
    if (justDragged.current) return; // ignore the click fired right after a drag
    setMenuOpen((o) => !o);
  };

  const handleThemeChange = (theme: ThemeColor) => {
    setCurrentTheme(theme);
    localStorage.setItem("site-theme", theme);
    applyTheme(theme);
    setMenuOpen(false);
  };

  // Close the menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        const panel = document.getElementById("theme-switcher-menu");
        if (panel && panel.contains(e.target as Node)) return;
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  if (!mounted) return null;

  const openLeft = position.x + BTN_SIZE / 2 > window.innerWidth / 2;
  const openUp = position.y > window.innerHeight / 2;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Selecionar tema"
        onPointerDown={handlePointerDown}
        onClick={handleClick}
        className="fixed z-[60] flex items-center justify-center rounded-full border-2 bg-card text-foreground shadow-lg transition-shadow"
        style={{
          left: position.x,
          top: position.y,
          width: BTN_SIZE,
          height: BTN_SIZE,
          borderColor: "hsl(var(--primary))",
          boxShadow: dragging
            ? "0 0 22px hsl(var(--primary) / 0.6)"
            : "0 0 10px hsl(var(--primary) / 0.35)",
          cursor: dragging ? "grabbing" : "grab",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        <Palette className="h-5 w-5" style={{ pointerEvents: "none" }} />
      </button>

      {menuOpen && (
        <div
          id="theme-switcher-menu"
          className="fixed z-[61] w-52 rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-2xl"
          style={{
            left: openLeft ? undefined : position.x,
            right: openLeft ? window.innerWidth - position.x - BTN_SIZE : undefined,
            top: openUp ? undefined : position.y + BTN_SIZE + 8,
            bottom: openUp ? window.innerHeight - position.y + 8 : undefined,
            borderColor: "hsl(var(--border))",
          }}
        >
          <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Tema do site</p>
          {(Object.keys(themes) as ThemeColor[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handleThemeChange(key)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <span
                className="h-4 w-4 flex-shrink-0 rounded-full border"
                style={{
                  background: themes[key].swatch,
                  borderColor: themes[key].swatchBorder ?? "hsl(var(--border))",
                }}
              />
              <span className="flex-1 text-left">{themes[key].name}</span>
              {currentTheme === key && <Check className="h-4 w-4" />}
            </button>
          ))}
          <p className="px-2 pt-1 text-[10px] leading-tight text-muted-foreground">
            Dica: arraste o ícone para movê-lo pelas bordas.
          </p>
        </div>
      )}
    </>
  );
};
