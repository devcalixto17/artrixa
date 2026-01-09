import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/home/HeroSection";
import { DownloadCard } from "@/components/cards/DownloadCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { data: downloads, isLoading } = useQuery({
    queryKey: ["recent-downloads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("downloads")
        .select("*, categories(name)")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      
      // Fetch author profiles for each download
      if (data && data.length > 0) {
        const authorIds = [...new Set(data.map(d => d.author_id).filter(Boolean))];
        
        if (authorIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, username, avatar_url")
            .in("user_id", authorIds);
          
          const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
          
          return data.map(download => ({
            ...download,
            author: download.author_id ? profileMap.get(download.author_id) : null
          }));
        }
      }
      
      return data?.map(d => ({ ...d, author: null })) || [];
    },
  });

  return (
    <Layout>
      <HeroSection />
      
      <section>
        <h2 className="font-display text-2xl font-bold text-primary mb-6">
          Últimos Downloads
        </h2>
        
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-48 bg-card animate-pulse rounded-lg" />
            ))}
          </div>
        ) : downloads && downloads.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {downloads.map((download) => (
              <DownloadCard
                key={download.id}
                id={download.id}
                title={download.title}
                description={download.description}
                imageUrl={download.image_url}
                downloadCount={download.download_count || 0}
                createdAt={download.created_at}
                categoryName={download.categories?.name}
                authorName={download.author?.username}
                authorAvatar={download.author?.avatar_url}
                authorUserId={download.author_id}
                compact
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-lg border border-border">
            <p className="text-muted-foreground">Nenhum download disponível ainda.</p>
          </div>
        )}
      </section>
    </Layout>
  );
};

export default Index;