import { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LightningText } from "./LightningText";

interface FundadorNameProps {
  userId?: string | null;
  /** Pre-fetched role list. If provided, skips the query. */
  roles?: string[];
  children: ReactNode;
  className?: string;
}

/**
 * Wraps children in LightningText if the user has the `fundador` role.
 * Otherwise renders children unchanged.
 */
export const FundadorName = ({ userId, roles, children, className }: FundadorNameProps) => {
  const { data } = useQuery({
    queryKey: ["fundador-check", userId],
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

  const allRoles = roles ?? data ?? [];
  const isFundador = allRoles.includes("fundador");

  if (!isFundador) return <>{children}</>;
  return (
    <LightningText color="#ef4444" className={className}>
      {children}
    </LightningText>
  );
};
