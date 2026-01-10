import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { DownloadCard } from "@/components/cards/DownloadCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Crosshair, Users, Skull, Sword } from "lucide-react";

const skinCategories = [
  { slug: "skins-armas", name: "Skins de Armas", icon: Crosshair },
  { slug: "skins-facas", name: "Skins de Facas", icon: Sword },
  { slug: "skins-player", name: "Skins de Players", icon: Users },
  { slug: "skins-zombies", name: "Skins de Zombies", icon: Skull },
];

export default function Skins() {
  /** 1️⃣ Busca APENAS as categorias de skins */
  const { data: categories } = useQuery({
    queryKey: ["skins-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug")
        .in(
          "slug",
          skinCategories.map((c) => c.slug)
        );

      if (error) throw error;
      return data;
    },
  });

  /** 2️⃣ Mapa slug -> id (seguro) */
  const categoryIdBySlug = useMemo(() => {
    return new Map(categories?.map((c) => [c.slug, c.id]) || []);
  }, [categories]);

  const categoryIds = categories?.map((c) => c.id) || [];

  /** 3️⃣ Busca os downloads APENAS por category_id */
  const { data: downloads, isLoading } = useQuery({
    queryKey: ["skins-downloads", categoryIds],
    queryFn: async () => {
      if (categoryIds.length === 0) return [];

      const { data, error } = await supabase
        .from("downloads")
        .select(`
          *,
          categories(name),
          profiles:author_id(username, avatar_url)
        `)
        .eq("status", "approved")
        .in("category_id", categoryIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: categoryIds.length > 0,
  });

  /** 4️⃣ Filtra localmente por aba (sem erro) */
  const getDownloadsBySlug = (slug: string) => {
    const categoryId = categoryIdBySlug.get(slug);
    if (!categoryId) return [];
    return downloads?.filter((d) => d.category_id === categoryId) || [];
  };

  return (
    <Layout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Skins</h1>
          <p className="text-muted-foreground">
            Personalize seu jogo com skins exclusivas
          </p>
        </div>

        <Tabs defaultValue="skins-armas">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            {skinCategories.map((cat) => (
              <TabsTrigger key={cat.slug} value={cat.slug} className="gap-2">
                <cat.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{cat.name}</span>
                <span className="sm:hidden">
                  {cat.name.split(" ").pop()}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {skinCategories.map((cat) => {
            const items = getDownloadsBySlug(cat.slug);

            return (
              <TabsContent key={cat.slug} value={cat.slug}>
                {isLoading ? (
                  <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-64 rounded-lg" />
                    ))}
                  </div>
                ) : items.length > 0 ? (
                  <div className="grid grid-cols-4 gap-4">
                    {items.map((download: any) => (
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
                        compact
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <cat.icon className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">
                      Nenhuma skin encontrada
                    </p>
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </Layout>
  );
}
