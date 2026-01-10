import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DownloadCard } from "@/components/cards/DownloadCard";

const SKIN_CATEGORIES = [
  {
    slug: "skins-armas",
    label: "Armas",
  },
  {
    slug: "skins-player",
    label: "Players",
  },
  {
    slug: "skins-zombies",
    label: "Zumbis",
  },
  {
    slug: "skins-facas",
    label: "Facas",
  },
];

export default function Skins() {
  const { data: downloads, isLoading, error } = useQuery({
    queryKey: ["skins-downloads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("downloads")
        .select(`
          *,
          categories!inner (
            id,
            name,
            slug
          ),
          profiles:author_id (
            username,
            avatar_url
          )
        `)
        .eq("status", "approved")
        .in(
          "categories.slug",
          SKIN_CATEGORIES.map((c) => c.slug)
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const getDownloadsByCategory = (slug: string) => {
    return downloads?.filter(
      (download) => download.categories?.slug === slug
    ) || [];
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-20 text-muted-foreground">
          Carregando skins...
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex justify-center py-20 text-red-500">
          Erro ao carregar skins
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <h1 className="mb-6 text-3xl font-bold">Skins</h1>

        <Tabs defaultValue={SKIN_CATEGORIES[0].slug}>
          <TabsList className="mb-6 flex flex-wrap gap-2">
            {SKIN_CATEGORIES.map((category) => (
              <TabsTrigger
                key={category.slug}
                value={category.slug}
              >
                {category.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {SKIN_CATEGORIES.map((category) => (
            <TabsContent
              key={category.slug}
              value={category.slug}
            >
              {getDownloadsByCategory(category.slug).length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  Nenhuma skin encontrada nesta categoria.
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {getDownloadsByCategory(category.slug).map((download) => (
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
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Layout>
  );
}
