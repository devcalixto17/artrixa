import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Users, Settings } from "lucide-react";

interface CustomRole {
  id: string;
  name: string;
  description: string | null;
  color: string;
  display_order: number;
  created_at: string;
}

export const CustomRolesManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#6b7280",
  });

  // Buscar cargos customizados
  const { data: customRoles, isLoading } = useQuery({
    queryKey: ["custom-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_roles")
        .select("*")
        .order("display_order", { ascending: true });
      
      if (error) throw error;
      return data as CustomRole[];
    },
  });

  // Buscar permissões disponíveis
  const { data: permissions } = useQuery({
    queryKey: ["all-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissions")
        .select("*")
        .order("category");
      if (error) throw error;
      return data || [];
    },
  });

  // Buscar permissões do cargo sendo editado
  const { data: rolePermissions } = useQuery({
    queryKey: ["custom-role-permissions", editingRole?.id],
    queryFn: async () => {
      if (!editingRole) return [];
      const { data, error } = await supabase
        .from("role_permissions")
        .select("permission_id")
        .eq("role_type", "custom_role")
        .eq("custom_role_id", editingRole.id);
      if (error) throw error;
      return data?.map(rp => rp.permission_id) || [];
    },
    enabled: !!editingRole,
  });

  // Criar cargo
  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("custom_roles")
        .insert({
          name: formData.name,
          description: formData.description || null,
          color: formData.color,
          created_by: user?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-roles"] });
      toast.success("Cargo criado com sucesso!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error("Erro ao criar cargo:", error);
      toast.error(error.message || "Erro ao criar cargo");
    },
  });

  // Atualizar cargo
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingRole) return;
      const { error } = await supabase
        .from("custom_roles")
        .update({
          name: formData.name,
          description: formData.description || null,
          color: formData.color,
        })
        .eq("id", editingRole.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-roles"] });
      toast.success("Cargo atualizado!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error("Erro ao atualizar cargo:", error);
      toast.error("Erro ao atualizar cargo");
    },
  });

  // Deletar cargo
  const deleteMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from("custom_roles")
        .delete()
        .eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-roles"] });
      toast.success("Cargo excluído!");
    },
    onError: (error) => {
      console.error("Erro ao excluir cargo:", error);
      toast.error("Erro ao excluir cargo");
    },
  });

  // Toggle permissão do cargo custom
  const togglePermissionMutation = useMutation({
    mutationFn: async ({ permissionId, enabled }: { permissionId: string; enabled: boolean }) => {
      if (!editingRole) return;
      
      if (enabled) {
        const { error } = await supabase
          .from("role_permissions")
          .insert({
            role_type: "custom_role",
            custom_role_id: editingRole.id,
            permission_id: permissionId,
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("role_permissions")
          .delete()
          .eq("role_type", "custom_role")
          .eq("custom_role_id", editingRole.id)
          .eq("permission_id", permissionId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-role-permissions", editingRole?.id] });
      toast.success("Permissão atualizada!");
    },
    onError: () => {
      toast.error("Erro ao atualizar permissão");
    },
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", color: "#6b7280" });
    setEditingRole(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (role: CustomRole) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || "",
      color: role.color,
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Cargos Personalizados
            </CardTitle>
            <CardDescription>
              Crie e gerencie cargos customizados com permissões específicas.
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} className="gap-2">
                <Plus className="w-4 h-4" />
                Novo Cargo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingRole ? "Editar Cargo" : "Criar Novo Cargo"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Cargo</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Moderador, VIP Gold, etc"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição do cargo..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color">Cor do Cargo</Label>
                  <div className="flex gap-3 items-center">
                    <Input
                      id="color"
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="flex-1"
                      placeholder="#6b7280"
                    />
                    <Badge
                      style={{
                        backgroundColor: `${formData.color}20`,
                        borderColor: `${formData.color}50`,
                        color: formData.color,
                      }}
                    >
                      Preview
                    </Badge>
                  </div>
                </div>

                {/* Permissões (apenas ao editar) */}
                {editingRole && (
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Permissões do Cargo
                    </Label>
                    <div className="grid gap-2 max-h-60 overflow-y-auto">
                      {permissions?.map((perm) => {
                        const isEnabled = rolePermissions?.includes(perm.id);
                        return (
                          <div
                            key={perm.id}
                            className="flex items-center justify-between p-2 bg-background rounded border"
                          >
                            <span className="text-sm">{perm.description}</span>
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={(checked) => {
                                togglePermissionMutation.mutate({
                                  permissionId: perm.id,
                                  enabled: checked,
                                });
                              }}
                              disabled={togglePermissionMutation.isPending}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button
                  onClick={() => editingRole ? updateMutation.mutate() : createMutation.mutate()}
                  disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
                >
                  {editingRole ? "Salvar" : "Criar Cargo"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : customRoles && customRoles.length > 0 ? (
            <div className="space-y-3">
              {customRoles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between p-4 bg-background rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: role.color }}
                    />
                    <div>
                      <p className="font-medium" style={{ color: role.color }}>
                        {role.name}
                      </p>
                      {role.description && (
                        <p className="text-sm text-muted-foreground">
                          {role.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(role)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir cargo?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Isso removerá o cargo "{role.name}" de todos os usuários. Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(role.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum cargo personalizado criado</p>
              <p className="text-sm">Clique em "Novo Cargo" para criar</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};