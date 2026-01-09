import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Award, Trophy, Star, Crown, Shield, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const iconMap: Record<string, React.ComponentType<any>> = {
  Award, Trophy, Star, Crown, Shield, Sparkles,
};

interface UserBadgesProps {
  userId: string;
}

export const UserBadges = ({ userId }: UserBadgesProps) => {
  const { data: userBadges } = useQuery({
    queryKey: ["user-badges", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_badges")
        .select("*, badges(*)")
        .eq("user_id", userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  if (!userBadges || userBadges.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-2 mt-2">
        {userBadges.map((ub) => {
          if (!ub.badges) return null;
          const badge = ub.badges as any;
          const isCustomIcon = badge.icon.startsWith("/"); // Verifica se é um ícone personalizado
          const BadgeIcon = !isCustomIcon ? iconMap[badge.icon] || Award : null; // Pega o componente Lucide se não for personalizado
          
          return (
            <Tooltip key={ub.id}>
              <TooltipTrigger>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                  style={{ 
                    backgroundColor: `${badge.color}20`,
                    boxShadow: `0 0 10px ${badge.color}40`
                  }}
                >
                  {isCustomIcon ? (
                    <img
                      src={badge.icon}
                      alt={badge.name}
                      className="w-4 h-4 object-contain" // Renderiza o ícone personalizado
                    />
                  ) : BadgeIcon ? (
                    <BadgeIcon className="w-4 h-4" style={{ color: badge.color }} /> // Renderiza o ícone Lucide
                  ) : null}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <p className="font-semibold">{badge.name}</p>
                  <p className="text-xs text-muted-foreground">{badge.description}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};