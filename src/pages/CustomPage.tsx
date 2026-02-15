import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import NotFound from "./NotFound";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Download, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { DownloadCard } from "@/components/cards/DownloadCard";

const CustomPage = () => {
    const { slug, parentSlug, subSlug, grandParentSlug } = useParams();

    // Resolve which slug to use for the query
    // The active slug is always the last segment of our dynamic routes
    const activeSlug = subSlug || slug || parentSlug;

    const { data: pageData, isLoading, error } = useQuery({
        queryKey: ["custom-page", activeSlug],
        queryFn: async () => {
            // First check if it's a main page
            const { data: page, error: pageError } = await supabase
                .from("custom_pages")
                .select("*")
                .eq("slug", activeSlug)
                .eq("status", "published")
                .maybeSingle();

            if (page) return { ...(page as object), type: 'page' } as any;

            // If not found, check if it's a submenu
            const { data: submenu, error: submenuError } = await supabase
                .from("custom_submenus")
                .select(`
          *,
          parent:custom_pages(*)
        `)
                .eq("slug", activeSlug)
                .maybeSingle();

            if (submenu && (submenu as any).parent?.status === 'published') {
                return { ...(submenu as object), type: 'submenu' } as any;
            }

            return null;
        },
        enabled: !!activeSlug,
    });

    // Fetch Sidebar Data (Categories & Most Downloaded)
    const { data: categories } = useQuery({
        queryKey: ["categories"],
        queryFn: async () => {
            const { data, error } = await supabase.from("categories").select("*").order("name");
            if (error) throw error;
            return data as any[];
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
            return data as any[];
        },
    });

    // Fetch related downloads if it's a submenu or page
    const { data: relatedDownloads, isLoading: linkedDownloadsLoading } = useQuery({
        queryKey: ["related-downloads", activeSlug, pageData?.id],
        queryFn: async () => {
            if (!pageData?.id) return [];

            const field = pageData.type === 'submenu' ? 'submenu_id' : 'category_id';

            // Note: If it's a page, we check if there's a category with the same slug
            let query = supabase
                .from("downloads")
                .select(`
                    *,
                    categories(name)
                `)
                .eq("status", "approved")
                .order("created_at", { ascending: false });

            if (pageData.type === 'submenu') {
                query = query.eq("submenu_id", pageData.id);
            } else {
                // Check if it's linked directly to this page
                query = query.eq("custom_page_id", pageData.id);

                // Also check if there's a category with the same slug (legacy support)
                const { data: cat } = await supabase.from("categories").select("id").eq("slug", activeSlug).maybeSingle();
                if (cat) {
                    query = query.or(`custom_page_id.eq.${pageData.id},category_id.eq.${cat.id}`);
                }
            }

            const { data, error } = await query;
            if (error) throw error;
            if (!data || data.length === 0) return [];

            // Fetch profiles separately (proven pattern)
            const authorIds = [...new Set(data.map(d => d.author_id).filter(Boolean))] as string[];
            if (authorIds.length > 0) {
                const { data: profiles } = await supabase
                    .from("profiles")
                    .select("user_id, username, avatar_url")
                    .in("user_id", authorIds);

                const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
                return data.map(d => ({
                    ...d,
                    profiles: d.author_id ? profileMap.get(d.author_id) : null
                }));
            }

            return data;
        },
        enabled: !!pageData?.id,
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <Header />
                <div className="flex-1 container mx-auto px-4 py-8">
                    <Skeleton className="h-12 w-3/4 mb-6" />
                    <Skeleton className="h-[400px] w-full" />
                </div>
                <Footer />
            </div>
        );
    }

    if (!pageData) {
        return <NotFound />;
    }

    const title = pageData.type === 'page' ? pageData.title : pageData.name;
    const content = pageData.type === 'page' ? pageData.content : `Página de submenu: ${pageData.name}`;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Main Content */}
                    <div className="lg:col-span-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="space-y-4">
                            <h1 className="text-4xl font-display font-black text-foreground tracking-tight uppercase border-l-4 border-primary pl-4">
                                {title}
                            </h1>
                            <div className="prose prose-invert max-w-none bg-secondary/20 p-6 rounded-xl border border-border/50">
                                <div dangerouslySetInnerHTML={{ __html: content }} />
                            </div>

                            {/* Related Downloads Section */}
                            {relatedDownloads && relatedDownloads.length > 0 && (
                                <div className="pt-8 border-t border-border/50">
                                    <h2 className="text-2xl font-display font-bold text-foreground mb-6 flex items-center gap-2">
                                        <Download className="w-6 h-6 text-primary" />
                                        PUBLICAÇÕES NESTA CATEGORIA
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {relatedDownloads.map((download: any) => (
                                            <DownloadCard
                                                key={download.id}
                                                id={download.id}
                                                title={download.title}
                                                description={download.description}
                                                imageUrl={download.image_url}
                                                downloadCount={download.download_count}
                                                createdAt={download.created_at}
                                                categoryName={download.categories?.name || pageData.name}
                                                authorName={download.profiles?.username}
                                                authorAvatar={download.profiles?.avatar_url}
                                                authorUserId={download.author_id}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <aside className="lg:col-span-4 space-y-8 animate-in fade-in slide-in-from-right-4 duration-700 delay-200">

                        {/* Categories */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
                                <span className="w-2 h-6 bg-primary rounded-full" />
                                CATEGORIAS
                            </h2>
                            <div className="grid grid-cols-1 gap-2">
                                {categories?.map((cat) => (
                                    <Link
                                        key={cat.id}
                                        to={`/categoria/${cat.slug}`}
                                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border hover:border-primary/50 hover:bg-secondary transition-all group"
                                    >
                                        <span className="font-medium group-hover:text-primary transition-colors uppercase text-sm tracking-wide">{cat.name}</span>
                                        <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </Link>
                                ))}
                            </div>
                        </section>

                        {/* Most Downloaded */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
                                <span className="w-2 h-6 bg-primary rounded-full" />
                                MAIS BAIXADOS
                            </h2>
                            <div className="space-y-3">
                                {topDownloads?.map((download) => (
                                    <Link key={download.id} to={`/download/${download.id}`}>
                                        <Card className="bg-secondary/30 border-border/50 hover:bg-secondary/50 transition-all group overflow-hidden">
                                            <CardContent className="p-3 flex gap-3">
                                                <div className="w-16 h-16 rounded overflow-hidden shrink-0 border border-border/50">
                                                    <img src={download.image_url} alt={download.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">{download.title}</h3>
                                                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                                        <span className="flex items-center gap-1">
                                                            <Eye className="w-3 h-3" />
                                                            {download.download_count || 0}
                                                        </span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        </section>

                    </aside>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default CustomPage;
