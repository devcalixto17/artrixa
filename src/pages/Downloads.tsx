import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { DownloadCard } from "@/components/cards/DownloadCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Puzzle, User, Target, Wrench, Map as MapIcon, Settings, Plus, FileText } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const iconMap: Record<string, React.ElementType> = {
  Puzzle,
  User,
  Target,
  Wrench,
  Map: MapIcon,
  Settings,
};

export default function Downloads() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const { user } = useAuth();

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const { data: submenus } = useQuery({
    queryKey: ["custom_submenus_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_submenus")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: customPages } = useQuery({
    queryKey: ["custom_pages_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_pages")
        .select("*")
        .eq("status", "published")
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  const { data: downloads, isLoading } = useQuery({
    queryKey: ["downloads", selectedCategory, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("downloads")
        .select(`
          *,
          categories(name, slug),
          custom_submenus:submenu_id(name),
          custom_pages:custom_page_id(title)
        `)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (selectedCategory) {
        if (selectedCategory.startsWith("cat:")) {
          query = query.eq("category_id", selectedCategory.replace("cat:", ""));
        } else if (selectedCategory.startsWith("sub:")) {
          query = query.eq("submenu_id", selectedCategory.replace("sub:", ""));
        } else if (selectedCategory.startsWith("page:")) {
          query = query.eq("custom_page_id", selectedCategory.replace("page:", ""));
        }
      }

      if (searchQuery.trim()) {
        const fuzzy = `%${searchQuery.trim().split('').join('%')}%`;
        const simple = `%${searchQuery.trim().replace(/\s+/g, '%')}%`;
        query = query.or(`title.ilike.${simple},description.ilike.${simple},title.ilike.${fuzzy}`);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const authorIds = [...new Set(data.map(d => d.author_id).filter(Boolean))] as string[];
      const profileMap = new Map<string, any>();
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, avatar_url")
          .in("user_id", authorIds);
        profiles?.forEach(p => profileMap.set(p.user_id, p));
      }

      return data.map(d => ({
        ...d,
        author: d.author_id ? profileMap.get(d.author_id) : null
      }));
    },
  });

  useEffect(() => {
    if (searchQuery) {
      setSearchParams({ search: searchQuery });
    } else {
      setSearchParams({});
    }
  }, [searchQuery, setSearchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <Layout>
      <div className="container py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Downloads</h1>
            <p className="text-muted-foreground"> Explore plugins, skins, mods e muito mais </p>
          </div>
          {user && (
            <Link to="/downloads/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Criar Publicação
              </Button>
            </Link>
          )}
        </div>

        <div className="flex flex-col gap-4 mb-8">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar downloads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </form>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              Todos
            </Button>
            {categories?.map((category) => {
              const IconComponent = iconMap[category.icon || "Puzzle"] || Puzzle;
              const val = `cat:${category.id}`;
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === val ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(val)}
                  className="gap-2"
                >
                  <IconComponent className="h-4 w-4" />
                  {category.name}
                </Button>
              );
            })}
            {submenus?.map((sub) => {
              const val = `sub:${sub.id}`;
              return (
                <Button
                  key={sub.id}
                  variant={selectedCategory === val ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(val)}
                  className="gap-2 border-primary/30"
                >
                  <Settings className="h-4 w-4" />
                  {sub.name}
                </Button>
              );
            })}
            {customPages?.map((page: any) => {
              const val = `page:${page.id}`;
              return (
                <Button
                  key={page.id}
                  variant={selectedCategory === val ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(val)}
                  className="gap-2 border-primary/30"
                >
                  <FileText className="h-4 w-4" />
                  {page.title}
                </Button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : downloads?.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery ? "Nenhum download encontrado." : "Nenhum download disponível."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {downloads?.map((download) => (
              <DownloadCard
                key={download.id}
                id={download.id}
                title={download.title}
                description={download.description}
                imageUrl={download.image_url}
                downloadCount={download.download_count}
                createdAt={download.created_at}
                categoryName={download.categories?.name || (download.custom_submenus as any)?.name || (download.custom_pages as any)?.title}
                authorName={download.author?.username}
                authorAvatar={download.author?.avatar_url}
                authorUserId={download.author_id}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}