import { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface LightningTextProps {
  children: ReactNode;
  color?: string;
  className?: string;
}

const BOLTS = [
  { top: "-30%", left: "5%", rot: -20, delay: "0s" },
  { top: "-40%", left: "45%", rot: 10, delay: "0.3s" },
  { top: "-25%", left: "85%", rot: -15, delay: "0.6s" },
  { top: "75%", left: "15%", rot: 200, delay: "0.9s" },
  { top: "85%", left: "55%", rot: 175, delay: "1.2s" },
  { top: "70%", left: "90%", rot: 195, delay: "0.45s" },
];

/**
 * Renders text with a flickering lightning/bolt effect overlay.
 * Used for the FUNDADOR/FUNDADORA role (color matches role color).
 */
export const LightningText = ({
  children,
  color = "#ef4444",
  className,
}: LightningTextProps) => {
  const style = { ["--lightning-color" as any]: color } as CSSProperties;
  return (
    <span className={cn("lightning-text", className)} style={style}>
      {BOLTS.map((b, i) => (
        <span
          key={i}
          className="lightning-bolt"
          aria-hidden
          style={{
            top: b.top,
            left: b.left,
            animationDelay: b.delay,
            ["--rot" as any]: `${b.rot}deg`,
          }}
        >
          ⚡
        </span>
      ))}
      <span className="relative z-10">{children}</span>
    </span>
  );
};
