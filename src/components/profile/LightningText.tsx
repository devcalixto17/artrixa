import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface LightningTextProps {
  children: ReactNode;
  color?: string;
  className?: string;
}

/**
 * Effect removed: now renders the founder name/role as plain text,
 * without the sparkle/glow/lightning animation.
 * Kept as a passthrough so existing imports keep working.
 */
export const LightningText = ({ children, className }: LightningTextProps) => {
  return <span className={cn(className)}>{children}</span>;
};
