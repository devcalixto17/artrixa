import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import NotFound from "./NotFound";
import { Download } from "lucide-react";
import { DownloadCard } from "@/components/cards/DownloadCard";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/PaginationControls";

const CustomPage = () => {
    const { slug, parentSlug, subSlug } = useParams();
    const activeSlug = subSlug || slug || parentSlug;

    const { data: pageData, isLoading } = useQuery({
        queryKey: ["custom-page", activeSlug],
        queryFn: async () => {
            const { data: page } = await supabase
                .from("custom_pages" as any)
                .select("*")
                .eq("slug", activeSlug)
                .eq("status", "published")
                .maybeSingle();

            if (page) return { ...(page as object), type: 'page' } as any;

            const { data: submenu } = await supabase
                .from("custom_submenus" as any)
                .select(`*, parent:custom_pages(*)`)
                .eq("slug", activeSlug)
                .maybeSingle();

            if (submenu && (submenu as any).parent?.status === 'published') {
                return { ...(submenu as object), type: 'submenu' } as any;
            }

            return null;
        },
        enabled: !!activeSlug,
    });

    const { data: relatedDownloads } = useQuery({
        queryKey: ["related-downloads", activeSlug, pageData?.id],
        queryFn: async () => {
            if (!pageData?.id) return [];

            let query = supabase
                .from("downloads")
                .select(`*, categories(name)`)
                .eq("status", "approved")
                .order("created_at", { ascending: false });

            if (pageData.type === 'submenu') {
                query = query.eq("submenu_id", pageData.id);
            } else {
                query = query.eq("custom_page_id", pageData.id);
                const { data: cat } = await supabase.from("categories").select("id").eq("slug", activeSlug).maybeSingle();
                if (cat) {
                    query = query.or(`custom_page_id.eq.${pageData.id},category_id.eq.${cat.id}`);
                }
            }

            const { data, error } = await query;
            if (error) throw error;
            if (!data || data.length === 0) return [];

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

    const { currentPage, totalPages, paginatedItems, goToPage } = usePagination(relatedDownloads);

    if (isLoading) {
        return (
            <Layout>
                <Skeleton className="h-12 w-3/4 mb-6" />
                <Skeleton className="h-[400px] w-full" />
            </Layout>
        );
    }

    if (!pageData) {
        return <NotFound />;
    }

    const title = pageData.type === 'page' ? pageData.title : pageData.name;
    const content = pageData.type === 'page' ? pageData.content : `Página de submenu: ${pageData.name}`;

    return (
        <Layout>
            <div className="space-y-8">
                <div className="space-y-4">
                    <h1 className="text-4xl font-display font-black text-foreground tracking-tight uppercase border-l-4 border-primary pl-4">
                        {title}
                    </h1>
                    <div className="prose prose-invert max-w-none bg-secondary/20 p-6 rounded-xl border border-border/50">
                        <div dangerouslySetInnerHTML={{ __html: content }} />
                    </div>
                </div>

                {relatedDownloads && relatedDownloads.length > 0 && (
                    <div className="pt-4 border-t border-border/50">
                        <h2 className="text-2xl font-display font-bold text-foreground mb-6 flex items-center gap-2">
                            <Download className="w-6 h-6 text-primary" />
                            PUBLICAÇÕES NESTA CATEGORIA
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {paginatedItems.map((download: any) => (
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
                        <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default CustomPage;
