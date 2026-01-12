import { Link } from "react-router-dom";
import { Download, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Sidebar = () => {
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

  const { data: topDownloads } = useQuery({
    queryKey: ["top-downloads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("downloads")
        .select("*")
        .eq("status", "approved")
        .order("download_count", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  return (
    <aside className="w-full lg:w-80 space-y-6">
      {/* Categories */}
      <div className="gradient-card rounded-lg border border-border p-4">
        <h3 className="font-display text-lg font-bold text-primary mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Categorias em Destaque
        </h3>
        <ul className="space-y-2">
          {categories?.map((category) => (
            <li key={category.id}>
              <Link
                to={`/categoria/${category.slug}`}
                className="block px-3 py-2 text-sm text-muted-foreground hover:text-primary hover:bg-secondary/50 rounded transition-colors"
              >
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Top Downloads */}
      <div className="gradient-card rounded-lg border border-border p-4">
        <h3 className="font-display text-lg font-bold text-primary mb-4 flex items-center gap-2">
          <Download className="w-5 h-5" />
          Mais Baixados
        </h3>
        <ul className="space-y-3">
          {topDownloads?.map((download) => (
            <li key={download.id}>
              <Link
                to={`/download/${download.id}`}
                className="flex items-center gap-3 group p-2 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                {/* Download Image */}
                {download.image_url ? (
                  <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                    <img 
                      src={download.image_url} 
                      alt={download.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                    <Download className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {download.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {download.download_count || 0} downloads
                  </p>
                </div>
              </Link>
            </li>
          ))}
          {(!topDownloads || topDownloads.length === 0) && (
            <li className="text-sm text-muted-foreground">
              Nenhum download ainda
            </li>
          )}
        </ul>
      </div>
    </aside>
  );
};
