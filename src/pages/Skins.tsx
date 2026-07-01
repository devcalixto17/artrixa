import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { DownloadCard } from "@/components/cards/DownloadCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Layers } from "lucide-react";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/PaginationControls";

export default function Skins() {
  const { data: allDownloads, isLoading } = useQuery({
    queryKey: ["all-skins-downloads-page"],
    queryFn: async () => {
      const skinSlugs = ["skins-armas", "skins-facas", "skins-player", "skins-zombies"];

      const { data: categories } = await supabase
        .from("categories")
        .select("id")
        .in("slug", skinSlugs);

      if (!categories || categories.length === 0) return [];

      const categoryIds = categories.map(c => c.id);

      const { data, error } = await supabase
        .from("downloads")
        .select(`*, categories(name, slug), profiles:author_id(username, avatar_url)`)
        .eq("status", "approved")
        .in("category_id", categoryIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const { currentPage, totalPages, paginatedItems, goToPage } = usePagination(allDownloads);

  return (
    <Layout>
      <div className="container py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Skins</h1>
          <p className="text-muted-foreground">
            Explore nossa coleção completa de skins. Use o menu principal para filtrar por categoria específica.
          </p>
        </div>

        {allDownloads && allDownloads.length > 0 && (
          <p className="text-sm text-muted-foreground mb-4">
            {allDownloads.length} skin(s) encontrada(s) no total
          </p>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-80 rounded-lg" />
            ))}
          </div>
        ) : allDownloads && allDownloads.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedItems.map((download: any) => (
                <DownloadCard
                  key={download.id}
                  id={download.id}
                  title={download.title}
                  description={download.description}
                  imageUrl={download.image_url}
                  downloadCount={download.download_count}
                  createdAt={download.created_at}
                  categoryName={download.categories?.name}
                  authorName={download.profiles?.username}
                  authorAvatar={download.profiles?.avatar_url}
                  authorUserId={download.author_id}
                />
              ))}
            </div>
            <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
          </>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma skin encontrada.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
