import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface SubmenuFormProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: any;
    pages: any[];
}

export const SubmenuForm = ({ isOpen, onClose, initialData, pages }: SubmenuFormProps) => {
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [parentId, setParentId] = useState("");
    const [parentSubmenuId, setParentSubmenuId] = useState<string | null>(null);
    const [displayOrder, setDisplayOrder] = useState("0");
    const queryClient = useQueryClient();

    useEffect(() => {
        if (initialData) {
            setName(initialData.name || "");
            setSlug(initialData.slug || "");
            setParentId(initialData.parent_page_id || "");
            setParentSubmenuId(initialData.parent_submenu_id || null);
            setDisplayOrder(String(initialData.display_order || "0"));
        } else {
            setName("");
            setSlug("");
            setParentId("");
            setParentSubmenuId(null);
            setDisplayOrder("0");
        }
    }, [initialData, isOpen]);

    const saveMutation = useMutation({
        mutationFn: async (data: any) => {
            if (initialData?.id) {
                const { error } = await supabase
                    .from("custom_submenus" as any)
                    .update(data)
                    .eq("id", initialData.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("custom_submenus" as any).insert(data);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["custom-submenus"] });
            toast.success(initialData ? "Submenu atualizado!" : "Submenu criado!");
            onClose();
        },
        onError: (error: any) => {
            console.error("Erro ao salvar submenu:", error);
            toast.error("Erro ao salvar: " + error.message);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim() || !slug.trim() || !parentId) {
            toast.error("Nome, Slug e Página Pai são obrigatórios.");
            return;
        }

        const formattedSlug = slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        saveMutation.mutate({
            name,
            slug: formattedSlug,
            parent_page_id: parentId,
            parent_submenu_id: parentSubmenuId,
            display_order: parseInt(displayOrder) || 0,
        });
    };

    const autoGenerateSlug = (val: string) => {
        setName(val);
        if (!initialData) {
            setSlug(val.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md bg-background">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-display font-bold">
                        {initialData ? "Editar Submenu" : "Novo Submenu"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="parent">Página Principal (Pai)</Label>
                        <Select value={parentId} onValueChange={(val) => {
                            setParentId(val);
                            setParentSubmenuId(null); // Reset submenu when page changes
                        }}>
                            <SelectTrigger id="parent">
                                <SelectValue placeholder="Selecione a página" />
                            </SelectTrigger>
                            <SelectContent>
                                {pages.map((page) => (
                                    <SelectItem key={page.id} value={page.id}>
                                        {page.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="parentSub">Submenu Superior (Opcional)</Label>
                        <Select value={parentSubmenuId || "none"} onValueChange={(val) => setParentSubmenuId(val === "none" ? null : val)}>
                            <SelectTrigger id="parentSub">
                                <SelectValue placeholder="Nível Direto da Página" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Nível Direto da Página</SelectItem>
                                {queryClient.getQueryData<any[]>(["custom-submenus"])
                                    ?.filter(s => s.parent_page_id === parentId && s.id !== initialData?.id && !s.parent_submenu_id)
                                    .map((sub) => (
                                        <SelectItem key={sub.id} value={sub.id}>
                                            {sub.name}
                                        </SelectItem>
                                    ))
                                }
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground italic">Deixe vazio para o primeiro nível de submenu.</p>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="subname">Nome do Submenu</Label>
                        <Input
                            id="subname"
                            placeholder="Ex: Nossa História"
                            value={name}
                            onChange={(e) => autoGenerateSlug(e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="subslug">Slug URL</Label>
                        <Input
                            id="subslug"
                            placeholder="nossa-historia"
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="suborder">Ordem de Exibição</Label>
                        <Input
                            id="suborder"
                            type="number"
                            placeholder="0"
                            value={displayOrder}
                            onChange={(e) => setDisplayOrder(e.target.value)}
                        />
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" disabled={saveMutation.isPending}>
                            {saveMutation.isPending ? "Salvando..." : initialData ? "Atualizar Submenu" : "Criar Submenu"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
