import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface PageFormProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: any;
}

export const PageForm = ({ isOpen, onClose, initialData }: PageFormProps) => {
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [content, setContent] = useState("");
    const [status, setStatus] = useState<"published" | "draft">("draft");
    const [isPinned, setIsPinned] = useState(false);
    const [displayOrder, setDisplayOrder] = useState("0");
    const queryClient = useQueryClient();

    useEffect(() => {
        if (initialData) {
            setTitle(initialData.title || "");
            setSlug(initialData.slug || "");
            setContent(initialData.content || "");
            setStatus(initialData.status || "draft");
            setIsPinned(initialData.is_pinned_header || false);
            setDisplayOrder(String(initialData.display_order || "0"));
        } else {
            setTitle("");
            setSlug("");
            setContent("");
            setStatus("draft");
            setIsPinned(false);
            setDisplayOrder("0");
        }
    }, [initialData, isOpen]);

    const saveMutation = useMutation({
        mutationFn: async (data: any) => {
            if (initialData?.id) {
                const { error } = await supabase
                    .from("custom_pages")
                    .update(data)
                    .eq("id", initialData.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("custom_pages").insert(data);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["custom-pages"] });
            toast.success(initialData ? "Página atualizada!" : "Página criada!");
            onClose();
        },
        onError: (error: any) => {
            console.error("Erro ao salvar página:", error);
            if (error.code === "23505") {
                toast.error("Este Slug já está em uso. Escolha outro.");
            } else {
                toast.error("Erro ao salvar: " + error.message);
            }
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        if (!title.trim() || !slug.trim()) {
            toast.error("Título e Slug são obrigatórios.");
            return;
        }

        // Slug formatting: lowercase, no spaces
        const formattedSlug = slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        saveMutation.mutate({
            title,
            slug: formattedSlug,
            content,
            status,
            is_pinned_header: isPinned,
            display_order: parseInt(displayOrder) || 0,
        });
    };

    const autoGenerateSlug = (val: string) => {
        setTitle(val);
        if (!initialData) {
            setSlug(val.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-display font-bold">
                        {initialData ? "Editar Página" : "Nova Página"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title">Título da Página</Label>
                        <Input
                            id="title"
                            placeholder="Ex: Sobre Nós"
                            value={title}
                            onChange={(e) => autoGenerateSlug(e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="slug">Slug (URL personalizada)</Label>
                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground bg-secondary px-2 py-1.5 rounded text-sm">
                                {"/"}
                            </span>
                            <Input
                                id="slug"
                                placeholder="sobre-nos"
                                value={initialData?.is_system ? (initialData.system_path || initialData.slug) : slug}
                                onChange={(e) => setSlug(e.target.value)}
                                disabled={initialData?.is_system}
                                required
                            />
                        </div>
                        {initialData?.is_system && (
                            <p className="text-[10px] text-primary font-bold uppercase">Esta é uma página de sistema. A URL não pode ser alterada.</p>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="content">Conteúdo (Markdown ou Texto Simples)</Label>
                        <Textarea
                            id="content"
                            placeholder="Escreva o conteúdo da página aqui..."
                            className="min-h-[200px]"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="status">Status</Label>
                            <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                                <SelectTrigger id="status">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="draft">Rascunho</SelectItem>
                                    <SelectItem value="published">Publicada</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="order">Ordem de Exibição (Header)</Label>
                            <Input
                                id="order"
                                type="number"
                                placeholder="0"
                                value={displayOrder}
                                onChange={(e) => setDisplayOrder(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg border border-border">
                        <div className="space-y-0.5">
                            <Label htmlFor="pin-header" className="text-base">Fixar no Header</Label>
                            <p className="text-sm text-muted-foreground">Aparecerá automaticamente na barra de navegação.</p>
                        </div>
                        <Switch
                            id="pin-header"
                            checked={isPinned}
                            onCheckedChange={setIsPinned}
                        />
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" disabled={saveMutation.isPending}>
                            {saveMutation.isPending ? "Salvando..." : initialData ? "Atualizar Página" : "Criar Página"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
