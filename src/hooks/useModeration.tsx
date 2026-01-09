import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { isPast } from "date-fns";

export const useModeration = () => {
  const { user } = useAuth();

  const { data: activeModeration, isLoading } = useQuery({
    queryKey: ["user-moderation", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("user_moderations")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .in("moderation_type", ["ban", "mute"])
        .order("applied_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      
      if (!data) return null;
      
      // Check if moderation has expired
      if (!data.is_permanent && data.expires_at) {
        if (isPast(new Date(data.expires_at))) {
          // Moderation has expired, deactivate it
          await supabase
            .from("user_moderations")
            .update({ is_active: false })
            .eq("id", data.id);
          return null;
        }
      }
      
      return data;
    },
    enabled: !!user,
    staleTime: 1000 * 30, // Check every 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute
  });

  const isBanned = activeModeration?.moderation_type === "ban";
  const isMuted = activeModeration?.moderation_type === "mute";

  return {
    activeModeration,
    isBanned,
    isMuted,
    isLoading,
  };
};
