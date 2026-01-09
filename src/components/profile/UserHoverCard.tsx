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

  const { data: userRole } = useQuery({
    queryKey: ["hover-role", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data?.role || "user";
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

  const roleConfig: Record<string, { label: string; color: string }> = {
    fundador: { label: "Fundador", color: "text-red-500 bg-red-500/10" },
    admin: { label: "Admin", color: "text-yellow-500 bg-yellow-500/10" },
    staff: { label: "Staff", color: "text-blue-500 bg-blue-500/10" },
    user: { label: "Usuário", color: "text-muted-foreground bg-muted" },
  };

  const role = roleConfig[userRole || "user"] || roleConfig.user;

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent 
        className="w-80 p-0 overflow-hidden" 
        side="top" 
        align="start" 
        sideOffset={10} 
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
              className="text-sm font-semibold hover:text-primary transition-colors" // Revertido para cor padrão
            >
              {profile?.username || "Usuário"}
            </Link>
            <Badge variant="secondary" className={`text-xs ${role.color}`}>
              {role.label}
            </Badge>
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
                <Badge
                  key={badge.id}
                  variant="outline"
                  className="text-xs flex items-center gap-1"
                  style={{ borderColor: badge.color }}
                >
                  <BadgeIcon className="w-3 h-3" style={{ color: badge.color }} />
                  {badge.name}
                </Badge>
              );
            })}
            {userBadges.length > 6 && (
              <Badge variant="outline" className="text-xs">
                +{userBadges.length - 6}
              </Badge>
            )}
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
};