import { Crown, Shield, Star, User, Gem, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { systemRoleStyles } from "@/lib/roleColors";

// Ícones e classe de glow por role (cores fortes vêm de systemRoleStyles)
const systemRoleConfig: Record<string, {
  label: string;
  icon: any;
  glowClass: string;
  priority: number;
}> = {
  fundador: {
    label: systemRoleStyles.fundador.label,
    icon: Crown,
    glowClass: "",
    priority: systemRoleStyles.fundador.priority,
  },
  admin: {
    label: systemRoleStyles.admin.label,
    icon: Shield,
    glowClass: "",
    priority: systemRoleStyles.admin.priority,
  },
  staff: {
    label: systemRoleStyles.staff.label,
    icon: Star,
    glowClass: "staff-glow",
    priority: systemRoleStyles.staff.priority,
  },
  vip_diamante: {
    label: systemRoleStyles.vip_diamante.label,
    icon: Gem,
    glowClass: "vip-glow",
    priority: systemRoleStyles.vip_diamante.priority,
  },
  user: {
    label: systemRoleStyles.user.label,
    icon: User,
    glowClass: "",
    priority: systemRoleStyles.user.priority,
  },
};

interface RoleBadgeProps {
  role?: string;
  userId?: string;
  showHighestOnly?: boolean;
}

export const RoleBadge = ({ role, userId, showHighestOnly = true }: RoleBadgeProps) => {
  // Se userId foi fornecido, buscar todos os roles do usuário
  const { data: userRoles } = useQuery({
    queryKey: ["user-all-roles", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      
      if (error) throw error;
      return data?.map(r => r.role) || [];
    },
    enabled: !!userId && !role,
  });

  // Buscar custom roles do usuário
  const { data: customRoles } = useQuery({
    queryKey: ["user-custom-roles", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("user_custom_roles")
        .select(`
          custom_role_id,
          custom_roles (
            name,
            color,
            display_order
          )
        `)
        .eq("user_id", userId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  // Determinar qual role exibir
  const rolesToShow: string[] = role 
    ? [role] 
    : (userRoles || []);

  // Ordenar por prioridade e pegar o mais alto
  const sortedRoles = rolesToShow
    .filter(r => r in systemRoleConfig)
    .sort((a, b) => (systemRoleConfig[a]?.priority || 100) - (systemRoleConfig[b]?.priority || 100));

  const highestRole = sortedRoles[0] || "user";
  const displayRoles = showHighestOnly ? [highestRole] : sortedRoles;

  const hasGlow = (r: string) => r === "staff" || r === "vip_diamante";

  return (
    <div className="flex flex-wrap gap-2">
      {displayRoles.map((currentRole) => {
        const config = systemRoleConfig[currentRole] || systemRoleConfig.user;
        const Icon = config.icon;
        const showGlow = hasGlow(currentRole);

        return (
          <div key={currentRole} className={`relative inline-flex ${config.glowClass}`}>
            {showGlow && (
              <>
                {/* Lightning rays effect */}
                <div className="absolute inset-0 overflow-visible pointer-events-none">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className={`absolute top-1/2 left-1/2 h-0.5 origin-left ${
                        currentRole === "fundador" ? "bg-pink-400" : 
                        currentRole === "vip_diamante" ? "bg-cyan-400" : "bg-blue-400"
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
                    currentRole === "fundador" ? "bg-pink-500/40" : 
                    currentRole === "vip_diamante" ? "bg-cyan-500/30" : "bg-blue-500/30"
                  } animate-pulse`}
                />
              </>
            )}
            
            <Badge
              variant="outline"
              className="gap-1.5 px-3 py-1.5 text-sm font-bold z-10 border"
              style={{
                backgroundColor: systemRoleStyles[currentRole]?.badgeBg || undefined,
                color: systemRoleStyles[currentRole]?.badgeText || undefined,
                borderColor: systemRoleStyles[currentRole]?.color || undefined,
              }}
            >
              <Icon className="w-4 h-4" />
              {config.label}
            </Badge>
          </div>
        );
      })}

      {/* Custom roles */}
      {customRoles?.map((ucr: any) => (
        <Badge
          key={ucr.custom_role_id}
          variant="outline"
          className="gap-1.5 px-3 py-1.5 text-sm font-bold border"
          style={{
            backgroundColor: ucr.custom_roles?.color,
            borderColor: ucr.custom_roles?.color,
            color: "#ffffff",
          }}
        >
          <UserCheck className="w-4 h-4" />
          {ucr.custom_roles?.name}
        </Badge>
      ))}
    </div>
  );
};