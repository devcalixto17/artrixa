import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Upload, Trash2, Award, Trophy, Star, Crown, Shield, Sparkles, Edit } from "lucide-react";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type Badge = Database["public"]["Tables"]["badges"]["Row"];

const iconOptions = [
  { value: "Award", icon: Award, label: "Medalha" },
  { value: "Trophy", icon: Trophy, label: "Troféu" },
  { value: "Star", icon: Star, label: "Estrela" },
  { value: "Crown", icon: Crown, label: "Coroa" },
  { value: "Shield", icon: Shield, label: "Escudo" },
  { value: "Sparkles", icon: Sparkles, label: "Brilho" },
];

// Lista de ícones prontos (incluindo GIFs)
const predefinedIcons = [
  { name: "Estrela Dourada", url: "/icons/golden-star.gif" },
  { name: "Fundadora", url: "/icons/coroasorte.gif" },
  { name: "Escudo Mágico", url: "/icons/magic-shield.gif" },
  { name: "Troféu Brilhante", url: "/icons/shiny-trophy.gif" },
  { name: "Medalha de Ouro", url: "/icons/gold-medal.gif" },
  { name: "Coração Batendo", url: "/icons/beating-heart.gif" },
  { name: "Fogo Animado", url: "/icons/animated-fire.gif" },
  { name: "Raio Elétrico", url: "/icons/electric-bolt.gif" },
  { name: "Estrela Cadente", url: "/icons/shooting-star.gif" },
  { name: "Escudo Dourado", url: "/icons/golden-shield.gif" },
];

const iconMap: Record<string, React.ComponentType<any>> = {
  Award, Trophy, Star, Crown, Shield, Sparkles,
};

export const BadgeManager = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<Badge | null>(null);
  const [newBadge, setNewBadge] = useState({
    name: "",
    description: "",
    color: "#FFD700",
    background_color: "#1a1a2e",
    icon: "Award",
  });

  const { data: badges, isLoading } = useQuery({
    queryKey: ["admin-badges"],
    queryFn: async () => {
      const { data, error } = await supabase.from("badges").select("*");
      if (error) throw error;
      return data;
    },
  });

  const saveBadgeMutation = useMutation({
    mutationFn: async (badgeData: typeof newBadge & { id?: string }) => {
      const badgeToSave = {
        name: badgeData.name,
        description: badgeData.description,
        color: badgeData.color,
        background_color: badgeData.background_color,
        icon: badgeData.icon,
        is_automatic: false,
      };

      if (badgeData.id) {
        const { error } = await supabase
          .from("badges")
          .update(badgeToSave)
          .eq("id", badgeData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("badges").insert(badgeToSave);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-badges"] });
      queryClient.invalidateQueries({ queryKey: ["badges"] });
      setIsDialogOpen(false);
      setNewBadge({ name: "", description: "", color: "#FFD700", background_color: "#1a1a2e", icon: "Award" });
      setEditingBadge(null);
      toast.success(editingBadge ? "Insígnia atualizada com sucesso!" : "Insígnia criada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao salvar insígnia: " + error.message);
    },
  });

  const deleteBadgeMutation = useMutation({
    mutationFn: async (badgeId: string) => {
      const { error } = await supabase.from("badges").delete().eq("id", badgeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-badges"] });
      queryClient.invalidateQueries({ queryKey: ["badges"] });
      toast.success("Insígnia excluída com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir insígnia: " + error.message);
    },
  });

  const handleSaveBadge = () => {
    if (!newBadge.name.trim()) {
      toast.error("Nome da insígnia é obrigatório");
      return;
    }
    saveBadgeMutation.mutate({ ...newBadge, id: editingBadge?.id });
  };

  const handleEditClick = (badge: Badge) => {
    setEditingBadge(badge);
    setNewBadge({
      name: badge.name,
      description: badge.description || "",
      color: badge.color,
      background_color: (badge as any).background_color || "#1a1a2e",
      icon: badge.icon,
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingBadge(null);
      setNewBadge({ name: "", description: "", color: "#FFD700", background_color: "#1a1a2e", icon: "Award" });
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground">Gerenciar Insígnias</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Insígnia
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-card border-border max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingBadge ? "Editar Insígnia" : "Criar Nova Insígnia"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={newBadge.name}
                  onChange={(e) => setNewBadge({ ...newBadge, name: e.target.value })}
                  placeholder="Nome da insígnia"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={newBadge.description}
                  onChange={(e) => setNewBadge({ ...newBadge, description: e.target.value })}
                  placeholder="Descrição da insígnia"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Cor do Ícone</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={newBadge.color}
                    onChange={(e) => setNewBadge({ ...newBadge, color: e.target.value })}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={newBadge.color}
                    onChange={(e) => setNewBadge({ ...newBadge, color: e.target.value })}
                    placeholder="#FFD700"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="background_color">Cor de Fundo</Label>
                <div className="flex gap-2">
                  <Input
                    id="background_color"
                    type="color"
                    value={newBadge.background_color}
                    onChange={(e) => setNewBadge({ ...newBadge, background_color: e.target.value })}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={newBadge.background_color}
                    onChange={(e) => setNewBadge({ ...newBadge, background_color: e.target.value })}
                    placeholder="#1a1a2e"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ícones Prontos</Label>
                <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto p-2 border rounded-lg">
                  {predefinedIcons.map((icon, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setNewBadge({ ...newBadge, icon: icon.url })}
                      className={`p-2 rounded-lg border-2 transition-colors flex flex-col items-center gap-1 ${
                        newBadge.icon === icon.url
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <img 
                        src={icon.url} 
                        alt={icon.name} 
                        className="w-8 h-8 object-contain"
                      />
                      <span className="text-xs text-center">{icon.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ícones Lucide</Label>
                <div className="grid grid-cols-6 gap-2">
                  {iconOptions.map((option) => {
                    const IconComp = option.icon;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setNewBadge({ ...newBadge, icon: option.value })}
                        className={`p-3 rounded-lg border-2 transition-colors flex flex-col items-center gap-1 ${
                          newBadge.icon === option.value
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <IconComp className="h-6 w-6 mx-auto" style={{ color: newBadge.color }} />
                        <span className="text-xs text-center">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label>Prévia</Label>
                <div className="p-4 rounded-lg bg-muted/50 border flex items-center justify-center">
                  <Badge
                    variant="outline"
                    className="text-sm flex items-center gap-2 px-4 py-2"
                    style={{ 
                      borderColor: newBadge.color,
                      backgroundColor: newBadge.background_color,
                    }}
                  >
                    {newBadge.icon.startsWith("/") ? (
                      <img
                        src={newBadge.icon}
                        alt="Preview"
                        className="w-5 h-5 object-contain"
                      />
                    ) : (
                      (() => {
                        const IconComp = iconMap[newBadge.icon] || Award;
                        return <IconComp className="w-5 h-5" style={{ color: newBadge.color }} />;
                      })()
                    )}
                    {newBadge.name || "Nome da Insígnia"}
                  </Badge>
                </div>
              </div>

              <Button
                onClick={handleSaveBadge}
                className="w-full"
                disabled={saveBadgeMutation.isPending}
              >
                {saveBadgeMutation.isPending ? "Salvando..." : (editingBadge ? "Salvar Alterações" : "Criar Insígnia")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {badges?.map((badge) => {
              const isCustomIcon = badge.icon.startsWith("/");
              const BadgeIcon = !isCustomIcon ? iconMap[badge.icon] || Award : null;
              
              return (
                <div
                  key={badge.id}
                  className="p-4 rounded-lg bg-muted/50 border border-border relative group"
                >
                  <button
                    onClick={() => deleteBadgeMutation.mutate(badge.id)}
                    className="absolute top-2 right-2 p-1 rounded-full bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Excluir Insígnia"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-10 p-1 rounded-full bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleEditClick(badge)}
                    title="Editar Insígnia"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${badge.color}20` }}
                    >
                      {isCustomIcon ? (
                        <img
                          src={badge.icon}
                          alt={badge.name}
                          className="w-6 h-6 object-contain"
                        />
                      ) : BadgeIcon ? (
                        <BadgeIcon className="w-6 h-6" style={{ color: badge.color }} />
                      ) : null}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{badge.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {badge.description || "Sem descrição"}
                      </p>
                    </div>
                  </div>
                  
                  {badge.is_automatic && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      Automática
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};