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
        .in("moderation_type", ["ban", "mute", "kick"])
        .order("applied_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) return null;

      // Check if moderation has expired (only for ban/mute, kicks are handled differently)
      if (data.moderation_type !== "kick" && !data.is_permanent && data.expires_at) {
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
    staleTime: 1000 * 10, // Check more frequently (every 10 seconds)
    refetchInterval: 1000 * 30, // Refetch every 30 seconds
  });

  const isBanned = activeModeration?.moderation_type === "ban";
  const isMuted = activeModeration?.moderation_type === "mute";
  const isKicked = activeModeration?.moderation_type === "kick";

  return {
    activeModeration,
    isBanned,
    isMuted,
    isKicked,
    isLoading,
  };
};
