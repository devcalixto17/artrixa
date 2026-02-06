import { Link } from "react-router-dom";
import { Download, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMemo } from "react";
import { UserHoverCard } from "@/components/profile/UserHoverCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DownloadCardProps {
  id: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  downloadCount?: number | null;
  createdAt: string;
  categoryName?: string;
  authorName?: string | null;
  authorAvatar?: string | null;
  authorUserId?: string | null;
}

export const DownloadCard = ({
  id,
  title,
  description,
  imageUrl,
  downloadCount,
  createdAt,
  categoryName,
  authorName,
  authorAvatar,
  authorUserId,
}: DownloadCardProps) => {
  // Strip HTML tags from description for preview
  const plainDescription = useMemo(() => {
    if (!description) return null;
    const doc = new DOMParser().parseFromString(description, 'text/html');
    return doc.body.textContent || "";
  }, [description]);

  // Fetch user role for coloring
  const { data: userRole } = useQuery({
    queryKey: ["download-card-user-role", authorUserId],
    queryFn: async () => {
      if (!authorUserId) return "user";
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authorUserId)
        .maybeSingle();
      if (error) throw error;
      return data?.role || "user";
    },
    enabled: !!authorUserId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const roleConfig: Record<string, { label: string; color: string }> = {
    fundador: { label: "FUNDADORA", color: "founder-gradient font-semibold" },
    admin: { label: "Admin", color: "text-yellow-500" },
    staff: { label: "Staff", color: "text-blue-500" },
    vip_diamante: { label: "Vip Diamante", color: "text-blue-500" },
    user: { label: "Usuário", color: "text-muted-foreground" },
  };

  const roleColorClass = roleConfig[userRole || "user"]?.color || "text-muted-foreground";

  return (
    <div className="group gradient-card rounded-lg border border-border card-hover download-card">
      <Link
        to={`/download/${id}`}
        className="block w-full overflow-hidden rounded-t-lg"
      >
        {/* Image */}
        <div className="download-card-image overflow-hidden rounded-t-lg">
          <img
            src={imageUrl || "/placeholder.svg"}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>

        {/* Content */}
        <div className="download-card-content">
          {categoryName && (
            <span className="inline-block px-2 py-1 text-xs font-medium bg-primary/20 text-primary rounded mb-2">
              {categoryName}
            </span>
          )}
          <h3 className="font-display text-lg font-bold text-primary group-hover:text-primary/80 transition-colors line-clamp-2">
            {title}
          </h3>
          {plainDescription && (
            <p className="text-muted-foreground text-sm mt-2 line-clamp-3">
              {plainDescription}
            </p>
          )}
        </div>
      </Link>

      {/* Footer */}
      <div className="download-card-footer">
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
          {/* Author */}
          {authorUserId ? (
            <UserHoverCard userId={authorUserId}>
              <Link
                to={`/profile/${authorUserId}`}
                className={`flex items-center gap-2 hover:text-foreground transition-colors ${roleColorClass}`}
                onClick={(e) => e.stopPropagation()}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={authorAvatar || undefined} />
                  <AvatarFallback>
                    <User className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
                <span>{authorName || "Usuário"}</span>
              </Link>
            </UserHoverCard>
          ) : (
            <span className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback>
                  <User className="h-3 w-3" />
                </AvatarFallback>
              </Avatar>
              <span>{authorName || "Usuário"}</span>
            </span>
          )}

          {/* Stats */}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Download className="w-3 h-3" />
              {downloadCount || 0}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(createdAt), "dd/MM/yy", { locale: ptBR })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};