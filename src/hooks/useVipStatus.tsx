import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useVipStatus() {
  const { user, isFundador } = useAuth();

  const { data: hasVipRole, isLoading } = useQuery({
    queryKey: ["vip-role", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "vip_diamante")
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
    enabled: !!user,
  });

  const isVip = hasVipRole || isFundador;

  return { isVip, isLoading };
}
