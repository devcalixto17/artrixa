import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Layers, Layout, ExternalLink, Edit, Trash2 } from "lucide-react";
import { PageForm } from "@/components/fundador/PageForm";
import { SubmenuForm } from "../components/fundador/SubmenuForm";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Fundador = () => {
    const [isPageFormOpen, setIsPageFormOpen] = useState(false);
    const [isSubmenuFormOpen, setIsSubmenuFormOpen] = useState(false);
    const [editingPage, setEditingPage] = useState<any>(null);
    const [editingSubmenu, setEditingSubmenu] = useState<any>(null);
    const queryClient = useQueryClient();

    // Fetch Pages
    const { data: pages, isLoading: isLoadingPages } = useQuery({
        queryKey: ["custom-pages"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("custom_pages" as any)
                .select("*")
                .order("display_order", { ascending: true });
            if (error) throw error;
            return data as any[];
        },
    });

    // Fetch Submenus
    const { data: submenus, isLoading: isLoadingSubmenus } = useQuery({
        queryKey: ["custom-submenus"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("custom_submenus" as any)
                .select(`
                    *,
                    parent:custom_pages(title)
                `)
                .order("display_order", { ascending: true });
            if (error) throw error;
            return data as any[];
        },
    });

    // Delete Page Mutation
    const deletePageMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("custom_pages" as any).delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["custom-pages"] });
            toast.success("Página excluída com sucesso!");
        },
        onError: (error: any) => {
            toast.error("Erro ao excluir página: " + error.message);
        },
    });

    // Delete Submenu Mutation
    const deleteSubmenuMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("custom_submenus" as any).delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["custom-submenus"] });
            toast.success("Submenu excluído com sucesso!");
        },
        onError: (error: any) => {
            toast.error("Erro ao excluir submenu: " + error.message);
        },
    });

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-display font-black text-foreground tracking-tight flex items-center gap-2">
                            <Layout className="w-8 h-8 text-primary" />
                            PAINEL DO FUNDADOR
                        </h1>
                        <p className="text-muted-foreground">Gerencie páginas personalizadas e menus do sistema.</p>
                    </div>
                </div>

                <Tabs defaultValue="pages" className="space-y-6">
                    <TabsList className="bg-secondary/50">
                        <TabsTrigger value="pages" className="gap-2">
                            <FileText className="w-4 h-4" />
                            Páginas
                        </TabsTrigger>
                        <TabsTrigger value="submenus" className="gap-2">
                            <Layers className="w-4 h-4" />
                            Submenus
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="pages" className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold">Páginas Customizadas</h2>
                            <Button onClick={() => { setEditingPage(null); setIsPageFormOpen(true); }} size="sm" className="gap-2">
                                <Plus className="w-4 h-4" />
                                Criar Nova Página
                            </Button>
                        </div>

                        <div className="grid gap-4">
                            {isLoadingPages ? (
                                <p>Carregando páginas...</p>
                            ) : pages?.map((page) => (
                                <Card key={page.id} className="overflow-hidden border-border/50 bg-secondary/20 transition-all hover:bg-secondary/30">
                                    <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${page.status === 'published' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-yellow-500'}`} />
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-foreground">{page.title}</h3>
                                                    {page.is_system && (
                                                        <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Sistema</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    URL: {page.system_path || `/${page.slug}`}
                                                </p>
                                            </div>
                                            {page.is_pinned_header && (
                                                <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-primary/30">
                                                    Navbar
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="sm" asChild>
                                                <a href={`/${page.slug}`} target="_blank" rel="noreferrer">
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => { setEditingPage(page); setIsPageFormOpen(true); }}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => deletePageMutation.mutate(page.id)}
                                                disabled={page.is_system}
                                                title={page.is_system ? "Páginas de sistema não podem ser excluídas" : "Excluir"}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {!isLoadingPages && pages?.length === 0 && (
                                <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                                    <p className="text-muted-foreground">Nenhuma página criada ainda.</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="submenus" className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold">Gerenciar Submenus</h2>
                            <Button onClick={() => { setEditingSubmenu(null); setIsSubmenuFormOpen(true); }} size="sm" className="gap-2">
                                <Plus className="w-4 h-4" />
                                Criar Submenu
                            </Button>
                        </div>

                        <div className="grid gap-4">
                            {isLoadingSubmenus ? (
                                <p>Carregando submenus...</p>
                            ) : submenus?.map((sub) => (
                                <Card key={sub.id} className="overflow-hidden border-border/50 bg-secondary/20 transition-all hover:bg-secondary/30">
                                    <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <Layers className="w-4 h-4 text-muted-foreground" />
                                            <div>
                                                <h3 className="font-bold text-foreground">{sub.name}</h3>
                                                <p className="text-xs text-muted-foreground">
                                                    Pai: <span className="text-primary font-medium">{sub.parent?.title || "Nenhum"}</span>
                                                    {sub.parent_submenu_id && (
                                                        <> | Submenu de: <span className="text-primary font-medium">{submenus?.find(s => s.id === sub.parent_submenu_id)?.name}</span></>
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => { setEditingSubmenu(sub); setIsSubmenuFormOpen(true); }}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => deleteSubmenuMutation.mutate(sub.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {!isLoadingSubmenus && submenus?.length === 0 && (
                                <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                                    <p className="text-muted-foreground">Nenhum submenu criado ainda.</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </main>

            <PageForm
                isOpen={isPageFormOpen}
                onClose={() => setIsPageFormOpen(false)}
                initialData={editingPage}
            />

            <SubmenuForm
                isOpen={isSubmenuFormOpen}
                onClose={() => setIsSubmenuFormOpen(false)}
                initialData={editingSubmenu}
                pages={pages || []}
            />

            <Footer />
        </div>
    );
};

export default Fundador;
