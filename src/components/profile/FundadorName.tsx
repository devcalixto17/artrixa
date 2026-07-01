import { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { getNameColor, CustomRoleLike } from "@/lib/roleColors";

interface FundadorNameProps {
  userId?: string | null;
  /** Pre-fetched system role list. If provided, skips the system-role query. */
  roles?: string[];
  children: ReactNode;
  className?: string;
}

/**
 * Renders a username colored with the user's highest role color.
 * Works for any role (system or custom). Falls back to plain text when the
 * user only has the default role.
 */
export const FundadorName = ({ userId, roles, children, className }: FundadorNameProps) => {
  const { data: fetchedRoles } = useQuery({
    queryKey: ["name-system-roles", userId],
    queryFn: async () => {
      if (!userId) return [] as string[];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (error) throw error;
      return data?.map((r) => r.role) || [];
    },
    enabled: !!userId && !roles,
    staleTime: 1000 * 60 * 5,
  });

  const { data: customRoles } = useQuery({
    queryKey: ["name-custom-roles", userId],
    queryFn: async () => {
      if (!userId) return [] as CustomRoleLike[];
      const { data, error } = await supabase
        .from("user_custom_roles")
        .select("custom_roles ( color, display_order )")
        .eq("user_id", userId);
      if (error) throw error;
      return (data || [])
        .map((d: any) => d.custom_roles)
        .filter(Boolean) as CustomRoleLike[];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const systemRoles = roles ?? fetchedRoles ?? [];
  const color = getNameColor(systemRoles, customRoles ?? []);

  if (!color) return <>{children}</>;

  return (
    <span
      className={cn("font-semibold", className)}
      style={{ color, textShadow: `0 0 6px ${color}55` }}
    >
      {children}
    </span>
  );
};
