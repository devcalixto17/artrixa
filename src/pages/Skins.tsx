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
  // Removido estado e query de categorias, pois agora é tudo via Header

  /** 🔹 Busca TODAS as skins de todas as categorias de skin conhecidas */
  const { data: allDownloads, isLoading } = useQuery({
    queryKey: ["all-skins-downloads-page"],
    queryFn: async () => {
      // Slugs das categorias de skins
      const skinSlugs = [
        "skins-armas",
        "skins-facas",
        "skins-player",
        "skins-zombies",
      ];

      // Primeiro pegamos os IDs dessas categorias
      const { data: categories } = await supabase
        .from("categories")
        .select("id")
        .in("slug", skinSlugs);

      if (!categories || categories.length === 0) return [];

      const categoryIds = categories.map(c => c.id);

      // Buscamos os downloads dessas categorias
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
            Explore nossa coleção completa de skins. Use o menu principal para filtrar por categoria específica.
          </p>
        </div>

        {/* Removed Buttons Section */}

        {/* Contador de resultados */}
        {allDownloads && allDownloads.length > 0 && (
          <p className="text-sm text-muted-foreground mb-4">
            {allDownloads.length} skin(s) encontrada(s) no total
          </p>
        )}

        {/* Conteúdo */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-80 rounded-lg" />
            ))}
          </div>
        ) : allDownloads && allDownloads.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {allDownloads.map((download: any) => (
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