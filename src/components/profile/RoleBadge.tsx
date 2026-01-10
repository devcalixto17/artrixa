import { Crown, Shield, Star, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RoleBadgeProps {
  role: "fundador" | "admin" | "staff" | "user";
}

const roleConfig = {
  fundador: {
    label: "FUNDADORA",
    icon: Crown,
    baseClass: "relative bg-red-500/20 text-white-400 border-blue-500/50",
    glowClass: "fundador-glow",
  },
  admin: {
    label: "Administrador(a)",
    icon: Shield,
    baseClass: "bg-amber-500/20 text-amber-400 border-amber-500/50",
    glowClass: "",
  },
  staff: {
    label: "Staff",
    icon: Star,
    baseClass: "relative bg-blue-500/20 text-blue-400 border-blue-500/50",
    glowClass: "staff-glow",
  },
  user: {
    label: "Usuário",
    icon: User,
    baseClass: "bg-muted text-muted-foreground border-border",
    glowClass: "",
  },
};

export const RoleBadge = ({ role }: RoleBadgeProps) => {
  const config = roleConfig[role] || roleConfig.user;
  const Icon = config.icon;
  const hasGlow = role === "fundador" || role === "staff";

  return (
    <div className={`relative inline-flex ${config.glowClass}`}>
      {hasGlow && (
        <>
          {/* Lightning rays effect */}
          <div className="absolute inset-0 overflow-visible pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className={`absolute top-1/2 left-1/2 h-0.5 origin-left ${
                  role === "fundador" ? "bg-red-400" : "bg-blue-400"
                }`}
                style={{
                  width: "20px",
                  transform: `rotate(${i * 45}deg) translateX(-50%)`,
                  animation: `ray-pulse 1.5s ease-in-out infinite`,
                  animationDelay: `${i * 0.1}s`,
                  opacity: 0.6,
                }}
              />
            ))}
          </div>
          
          {/* Outer glow */}
          <div
            className={`absolute -inset-1 rounded-full blur-md ${
              role === "fundador" ? "bg-red-500/30" : "bg-blue-500/30"
            } animate-pulse`}
          />
        </>
      )}
      
      <Badge
        variant="outline"
        className={`${config.baseClass} gap-1.5 px-3 py-1.5 text-sm font-semibold z-10`}
      >
        <Icon className="w-4 h-4" />
        {config.label}
      </Badge>
    </div>
  );
};
