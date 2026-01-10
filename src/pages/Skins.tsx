import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { DownloadCard } from "@/components/cards/DownloadCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Crosshair, Users, Skull, Sword } from "lucide-react";

export default function Skins() {
  const { data: categories } = useQuery({
    queryKey: ["skins-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .in("slug", ["skins-armas", "skins-player", "skins-zombies", "skins-facas"]);
      if (error) throw error;
      return data;
    },
  });

  const skinsCategoryIds = categories?.map((c) => c.id) || [];
  const categoryIdBySlug = useMemo(() => {
    return new Map((categories || []).map((c) => [c.slug, c.id] as const));
  }, [categories]);

  const { data: downloads, isLoading } = useQuery({
    queryKey: ["skins-downloads", skinsCategoryIds],
    queryFn: async () => {
      if (skinsCategoryIds.length === 0) return [];
      const { data, error } = await supabase
        .from("downloads")
        .select(
          `
          *,
          categories(name, slug),
          profiles:author_id(username, avatar_url)
        `
        )
        .eq("status", "approved")
        .in("category_id", skinsCategoryIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: skinsCategoryIds.length > 0,
  });

  const skinCategories = [
    { slug: "skins-armas", name: "Skins de Armas", icon: Crosshair },
    { slug: "skins-facas", name: "Skins de Facas", icon: Sword },
    { slug: "skins-player", name: "Skins de Players", icon: Users },
    { slug: "skins-zombies", name: "Skins de Zombies", icon: Skull },
  ];

  const getDownloadsByCategory = (slug: string) => {
    const categoryId = categoryIdBySlug.get(slug);
    if (!categoryId) return [];
    return downloads?.filter((d) => d.category_id === categoryId) || [];
  };

  return (
    <Layout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Skins</h1>
          <p className="text-muted-foreground">
            Personalize seu jogo com skins exclusivas para armas, players e zombies
          </p>
        </div>

        <Tabs defaultValue="skins-armas" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            {skinCategories.map((cat) => (
              <TabsTrigger key={cat.slug} value={cat.slug} className="gap-2">
                <cat.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{cat.name}</span>
                <span className="sm:hidden">{cat.name.split(" ").pop()}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {skinCategories.map((cat) => (
            <TabsContent key={cat.slug} value={cat.slug}>
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-64 rounded-lg" />
                  ))}
                </div>
              ) : getDownloadsByCategory(cat.slug).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {getDownloadsByCategory(cat.slug).map((download) => (
                    <DownloadCard
                      key={download.id}
                      id={download.id}
                      title={download.title}
                      description={download.description}
                      imageUrl={download.image_url}
                      downloadCount={download.download_count}
                      createdAt={download.created_at}
                      categoryName={download.categories?.name}
                      authorName={(download as any).profiles?.username}
                      authorAvatar={(download as any).profiles?.avatar_url}
                      authorUserId={download.author_id}
                      compact
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <cat.icon className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground">
                    Nenhuma skin encontrada
                  </h3>
                  <p className="text-sm text-muted-foreground/70">
                    Ainda não há skins nesta categoria
                  </p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Layout>
  );
}
