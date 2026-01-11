import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { DownloadCard } from "@/components/cards/DownloadCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Crosshair,
  Sword,
  Users,
  Skull,
  Layers,
} from "lucide-react";

const SKIN_SLUGS = [
  "skins-armas",
  "skins-facas",
  "skins-player",
  "skins-zombies",
];

const categoryIcons: Record<string, any> = {
  "skins-armas": Crosshair,
  "skins-facas": Sword,
  "skins-player": Users,
  "skins-zombies": Skull,
};

export default function Skins() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  /** 🔹 Busca categorias de skins */
  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ["skins-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug")
        .in("slug", SKIN_SLUGS)
        .order("name");

      if (error) throw error;
      console.log("Categories loaded:", data);
      return data || [];
    },
  });

  // Selecionar primeira categoria automaticamente quando carregar
  useEffect(() => {
    if (categories && categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id);
    }
  }, [categories, activeCategory]);

  /** 🔹 Busca TODAS as skins de todas as categorias */
  const { data: allDownloads, isLoading: loadingAll } = useQuery({
    queryKey: ["all-skins-downloads"],
    queryFn: async () => {
      if (!categories || categories.length === 0) return [];
      
      const categoryIds = categories.map(c => c.id);
      
      const { data, error } = await supabase
        .from("downloads")
        .select(`
          *,
          categories(name, slug),
          profiles:author_id(username, avatar_url)
        `)
        .eq("status", "approved")
        .in("category_id", categoryIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      console.log("All skins downloads:", data);
      return data || [];
    },
    enabled: !!categories && categories.length > 0,
  });

  // Filtrar downloads pela categoria ativa
  const filteredDownloads = activeCategory === "all" 
    ? allDownloads 
    : allDownloads?.filter(d => d.category_id === activeCategory);

  const isLoading = loadingCategories || loadingAll;

  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Skins
          </h1>
          <p className="text-muted-foreground">
            Personalize seu jogo com skins exclusivas
          </p>
        </div>

        {/* Botões de categorias */}
        <div className="flex flex-wrap gap-3 mb-8">
          {/* Botão "Todas" */}
          <Button
            variant={activeCategory === "all" ? "default" : "outline"}
            onClick={() => setActiveCategory("all")}
            className="gap-2"
          >
            <Layers className="w-4 h-4" />
            Todas
          </Button>

          {loadingCategories ? (
            <>
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </>
          ) : (
            categories?.map((cat) => {
              const Icon = categoryIcons[cat.slug] || Layers;
              const isActive = activeCategory === cat.id;

              return (
                <Button
                  key={cat.id}
                  variant={isActive ? "default" : "outline"}
                  onClick={() => setActiveCategory(cat.id)}
                  className="gap-2"
                >
                  <Icon className="w-4 h-4" />
                  {cat.name}
                </Button>
              );
            })
          )}
        </div>

        {/* Contador de resultados */}
        {filteredDownloads && filteredDownloads.length > 0 && (
          <p className="text-sm text-muted-foreground mb-4">
            {filteredDownloads.length} skin(s) encontrada(s)
          </p>
        )}

        {/* Conteúdo */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        ) : filteredDownloads && filteredDownloads.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDownloads.map((download: any) => (
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
          <div className="text-center py-16 text-muted-foreground">
            <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma skin encontrada nesta categoria</p>
          </div>
        )}
      </div>
    </Layout>
  );
}