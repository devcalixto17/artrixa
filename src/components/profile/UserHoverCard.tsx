import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, Award, Trophy, Star, Crown, Shield, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { systemRoleStyles, getNameColor } from "@/lib/roleColors";

const iconMap: Record<string, React.ComponentType<any>> = {
  Award, Trophy, Star, Crown, Shield, Sparkles,
};

interface UserHoverCardProps {
  userId: string;
  children: React.ReactNode;
}

export const UserHoverCard = ({ userId, children }: UserHoverCardProps) => {
  const { data: profile } = useQuery({
    queryKey: ["hover-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const { data: userRoles } = useQuery({
    queryKey: ["hover-roles", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (error) throw error;
      return data?.map(r => r.role) || ["user"];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: userBadges } = useQuery({
    queryKey: ["hover-badges", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_badges")
        .select("*, badges(*)")
        .eq("user_id", userId);
      if (error) throw error;
      return data?.map((ub) => ub.badges).filter(Boolean) || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: customRoles } = useQuery({
    queryKey: ["hover-custom-roles", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_custom_roles")
        .select("custom_roles ( name, color, display_order )")
        .eq("user_id", userId);
      if (error) throw error;
      return (data || []).map((d: any) => d.custom_roles).filter(Boolean);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const labelFor = (role: string) =>
    systemRoleStyles[role]?.label ?? systemRoleStyles.user.label;

  // Priority order for role display
  const rolePriority: Record<string, number> = {
    fundador: 1, admin: 2, staff: 3, vip_diamante: 4, user: 100,
  };

  const sortedRoles = (userRoles || ["user"])
    .sort((a, b) => (rolePriority[a] || 100) - (rolePriority[b] || 100));

  const nameColor = getNameColor(userRoles || [], customRoles || []);

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent
        className="w-80 p-0 overflow-hidden z-[9999]"
        side="top"
        align="start"
        sideOffset={15}
      >
        {/* Banner do Perfil */}
        {profile?.banner_url && (
          <div className="h-20 w-full relative">
            <img
              src={profile.banner_url}
              alt="Banner do Perfil"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
          </div>
        )}

        <div className="p-4 flex gap-4 relative z-10">
          <Link to={`/profile/${userId}`}>
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-xl">
                {profile?.username?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="space-y-1 flex-1">
            <Link
              to={`/profile/${userId}`}
              className="text-sm font-semibold hover:opacity-80 transition-opacity"
              style={nameColor ? { color: nameColor, textShadow: `0 0 6px ${nameColor}55` } : undefined}
            >
              {profile?.username || "Usuário"}
            </Link>
            <div className="flex flex-wrap gap-1">
              {sortedRoles
                .filter(r => r !== "user")
                .map((r) => {
                  const style = systemRoleStyles[r] || systemRoleStyles.user;
                  return (
                    <Badge
                      key={r}
                      variant="outline"
                      className="text-xs font-bold border"
                      style={{
                        backgroundColor: style.badgeBg || undefined,
                        color: style.badgeText || undefined,
                        borderColor: style.color || undefined,
                      }}
                    >
                      {labelFor(r)}
                    </Badge>
                  );
                })}
              {(customRoles || []).map((cr: any, i: number) => (
                <Badge
                  key={`custom-${i}`}
                  variant="outline"
                  className="text-xs font-bold border"
                  style={{
                    backgroundColor: cr.color,
                    borderColor: cr.color,
                    color: "#ffffff",
                  }}
                >
                  {cr.name}
                </Badge>
              ))}
              {sortedRoles.every(r => r === "user") && (customRoles || []).length === 0 && (
                <Badge variant="secondary" className="text-xs">
                  {systemRoleStyles.user.label}
                </Badge>
              )}
            </div>
            {profile?.bio && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                {profile.bio}
              </p>
            )}
            {profile?.created_at && (
              <div className="flex items-center gap-1 pt-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Membro desde {format(new Date(profile.created_at), "MMM yyyy", { locale: ptBR })}
              </div>
            )}
          </div>
        </div>

        {/* Badges */}
        {userBadges && userBadges.length > 0 && (
          <div className="flex flex-wrap gap-1 px-4 pb-4 pt-3 border-t">
            {userBadges.slice(0, 6).map((badge: any) => {
              const BadgeIcon = iconMap[badge.icon] || Award;
              return (
                <Link key={badge.id} to="/insignias" aria-label={`Ver insígnia ${badge.name}`}>
                  <Badge
                    variant="outline"
                    className="text-xs flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ borderColor: badge.color }}
                  >
                    <BadgeIcon className="w-3 h-3" style={{ color: badge.color }} />
                    {badge.name}
                  </Badge>
                </Link>
              );
            })}
            {userBadges.length > 6 && (
              <Link to="/insignias">
                <Badge variant="outline" className="text-xs cursor-pointer hover:opacity-80">
                  +{userBadges.length - 6}
                </Badge>
              </Link>
            )}
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
};