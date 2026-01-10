import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { DownloadCard } from "@/components/cards/DownloadCard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Crosshair,
  Sword,
  Users,
  Skull,
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
      return data;
    },
  });

  /** 🔹 Busca downloads da categoria ativa */
  const { data: downloads, isLoading } = useQuery({
    queryKey: ["skins-downloads", activeCategory],
    queryFn: async () => {
      if (!activeCategory) return [];

      const { data, error } = await supabase
        .from("downloads")
        .select(`
          *,
          categories(name),
          profiles:author_id(username, avatar_url)
        `)
        .eq("status", "approved")
        .eq("category_id", activeCategory)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!activeCategory,
  });

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
          {loadingCategories ? (
            <Skeleton className="h-10 w-40" />
          ) : (
            categories?.map((cat) => {
              const Icon = categoryIcons[cat.slug];
              const isActive = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg border
                    transition-all text-sm
                    ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:bg-muted"
                    }
                  `}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {cat.name}
                </button>
              );
            })
          )}
        </div>

        {/* Conteúdo */}
        {!activeCategory ? (
          <div className="text-center py-16 text-muted-foreground">
            Selecione uma categoria para ver as skins
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        ) : downloads && downloads.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {downloads.map((download: any) => (
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
            Nenhuma skin encontrada nesta categoria
          </div>
        )}
      </div>
    </Layout>
  );
}
