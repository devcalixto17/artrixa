import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { DownloadCard } from "@/components/cards/DownloadCard";
import { Skeleton } from "@/components/ui/skeleton";

const Category = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: category, isLoading: categoryLoading } = useQuery({
    queryKey: ["category", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", slug)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: downloads, isLoading: downloadsLoading } = useQuery({
    queryKey: ["downloads-by-category", category?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("downloads")
        .select("*")
        .eq("category_id", category!.id)
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!category?.id,
  });

  // Fetch author profiles separately
  const authorIds = downloads?.map(d => d.author_id).filter(Boolean) || [];
  const { data: authorProfiles } = useQuery({
    queryKey: ["author-profiles", authorIds],
    queryFn: async () => {
      if (authorIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", authorIds);
      
      if (error) throw error;
      return data;
    },
    enabled: authorIds.length > 0,
  });

  const getAuthorInfo = (authorId: string | null) => {
    if (!authorId || !authorProfiles) return { username: "Anônimo", avatar_url: null };
    const profile = authorProfiles.find(p => p.user_id === authorId);
    return {
      username: profile?.username || "Usuário",
      avatar_url: profile?.avatar_url || null
    };
  };

  const isLoading = categoryLoading || downloadsLoading;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {categoryLoading ? (
          <Skeleton className="h-10 w-48 mb-8" />
        ) : (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              {category?.icon && <span className="text-4xl">{category.icon}</span>}
              {category?.name}
            </h1>
            <p className="text-muted-foreground mt-2">
              Explore todos os {category?.name?.toLowerCase()} disponíveis
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        ) : downloads && downloads.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {downloads.map((download) => {
              const authorInfo = getAuthorInfo(download.author_id);
              return (
                <DownloadCard
                  key={download.id}
                  id={download.id}
                  title={download.title}
                  imageUrl={download.image_url}
                  authorUserId={download.author_id}
                  authorName={authorInfo.username}
                  authorAvatar={authorInfo.avatar_url}
                  createdAt={download.created_at}
                  downloadCount={download.download_count}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">
              Nenhuma publicação encontrada nesta categoria.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Category;
