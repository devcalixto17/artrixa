import { Crown, Shield, Star, User, Gem, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Configurações de roles do sistema (app_role)
const systemRoleConfig: Record<string, {
  label: string;
  icon: any;
  baseClass: string;
  glowClass: string;
  priority: number;
}> = {
  fundador: {
    label: "FUNDADORA",
    icon: Crown,
    baseClass: "relative bg-red-500/20 text-white border-red-500/50",
    glowClass: "fundador-glow",
    priority: 1,
  },
  admin: {
    label: "Administrador(a)",
    icon: Shield,
    baseClass: "bg-amber-500/20 text-amber-400 border-amber-500/50",
    glowClass: "",
    priority: 2,
  },
  staff: {
    label: "Staff",
    icon: Star,
    baseClass: "relative bg-blue-500/20 text-blue-400 border-blue-500/50",
    glowClass: "staff-glow",
    priority: 3,
  },
  vip_diamante: {
    label: "VIP DIAMANTE",
    icon: Gem,
    baseClass: "bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border-cyan-500/50",
    glowClass: "vip-glow",
    priority: 4,
  },
  user: {
    label: "Usuário",
    icon: User,
    baseClass: "bg-muted text-muted-foreground border-border",
    glowClass: "",
    priority: 100,
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

  const hasGlow = (r: string) => r === "fundador" || r === "staff" || r === "vip_diamante";

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
                        currentRole === "fundador" ? "bg-red-400" : 
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
                    currentRole === "fundador" ? "bg-red-500/30" : 
                    currentRole === "vip_diamante" ? "bg-cyan-500/30" : "bg-blue-500/30"
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
      })}

      {/* Custom roles */}
      {customRoles?.map((ucr: any) => (
        <Badge
          key={ucr.custom_role_id}
          variant="outline"
          className="gap-1.5 px-3 py-1.5 text-sm font-semibold"
          style={{
            backgroundColor: `${ucr.custom_roles?.color}20`,
            borderColor: `${ucr.custom_roles?.color}50`,
            color: ucr.custom_roles?.color,
          }}
        >
          <UserCheck className="w-4 h-4" />
          {ucr.custom_roles?.name}
        </Badge>
      ))}
    </div>
  );
};