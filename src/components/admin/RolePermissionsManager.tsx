import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Shield, 
  Crown, 
  Star, 
  User, 
  Gem,
  Lock,
  Users,
  FileText,
  Settings,
  Sparkles,
  Headphones
} from "lucide-react";

// Cargos do sistema (app_role)
const systemRoles = [
  { name: "fundador", label: "Fundador", icon: Crown, color: "text-red-400", locked: true },
  { name: "admin", label: "Administrador", icon: Shield, color: "text-amber-400", locked: false },
  { name: "staff", label: "Staff", icon: Star, color: "text-blue-400", locked: false },
  { name: "vip_diamante", label: "VIP Diamante", icon: Gem, color: "text-cyan-400", locked: false },
  { name: "user", label: "Usuário", icon: User, color: "text-muted-foreground", locked: false },
];

// Ícones por categoria
const categoryIcons: Record<string, any> = {
  moderation: Shield,
  content: FileText,
  vip: Sparkles,
  users: Users,
  admin: Settings,
  support: Headphones,
};

const categoryLabels: Record<string, string> = {
  moderation: "Moderação",
  content: "Conteúdo",
  vip: "VIP",
  users: "Usuários",
  admin: "Administração",
  support: "Suporte",
};

export const RolePermissionsManager = () => {
  const [activeRole, setActiveRole] = useState("admin");
  const queryClient = useQueryClient();

  // Buscar permissões disponíveis
  const { data: permissions, isLoading: loadingPermissions } = useQuery({
    queryKey: ["all-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissions")
        .select("*")
        .order("category", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Buscar permissões do cargo ativo
  const { data: rolePermissions, isLoading: loadingRolePerms } = useQuery({
    queryKey: ["role-permissions", activeRole],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("permission_id")
        .eq("role_type", "app_role")
        .eq("role_name", activeRole);
      
      if (error) throw error;
      return data?.map(rp => rp.permission_id) || [];
    },
  });

  // Mutation para toggle de permissão
  const togglePermissionMutation = useMutation({
    mutationFn: async ({ permissionId, enabled }: { permissionId: string; enabled: boolean }) => {
      if (enabled) {
        // Adicionar permissão
        const { error } = await supabase
          .from("role_permissions")
          .insert({
            role_type: "app_role",
            role_name: activeRole,
            permission_id: permissionId,
          });
        if (error) throw error;
      } else {
        // Remover permissão
        const { error } = await supabase
          .from("role_permissions")
          .delete()
          .eq("role_type", "app_role")
          .eq("role_name", activeRole)
          .eq("permission_id", permissionId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-permissions", activeRole] });
      toast.success("Permissão atualizada!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar permissão:", error);
      toast.error("Erro ao atualizar permissão");
    },
  });

  // Agrupar permissões por categoria
  const groupedPermissions = permissions?.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, typeof permissions>);

  const isRoleLocked = activeRole === "fundador";
  const isLoading = loadingPermissions || loadingRolePerms;

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Gerenciar Permissões por Cargo
          </CardTitle>
          <CardDescription>
            Configure o que cada cargo pode fazer no site. Estilo Discord.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Seletor de cargo */}
          <Tabs value={activeRole} onValueChange={setActiveRole}>
            <TabsList className="grid grid-cols-5 mb-6">
              {systemRoles.map((role) => {
                const Icon = role.icon;
                return (
                  <TabsTrigger
                    key={role.name}
                    value={role.name}
                    className="gap-2"
                  >
                    <Icon className={`w-4 h-4 ${role.color}`} />
                    <span className="hidden sm:inline">{role.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {systemRoles.map((role) => (
              <TabsContent key={role.name} value={role.name}>
                {isRoleLocked && activeRole === "fundador" && (
                  <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-amber-400 text-sm flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      O cargo Fundador possui TODAS as permissões e não pode ser alterado.
                    </p>
                  </div>
                )}

                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {groupedPermissions && Object.entries(groupedPermissions).map(([category, perms]) => {
                      const CategoryIcon = categoryIcons[category] || Settings;
                      
                      return (
                        <div key={category} className="space-y-3">
                          <div className="flex items-center gap-2 text-lg font-semibold">
                            <CategoryIcon className="w-5 h-5 text-primary" />
                            {categoryLabels[category] || category}
                          </div>
                          
                          <div className="grid gap-3">
                            {perms?.map((permission) => {
                              const isEnabled = rolePermissions?.includes(permission.id) || false;
                              
                              return (
                                <div
                                  key={permission.id}
                                  className="flex items-center justify-between p-3 bg-background rounded-lg border border-border"
                                >
                                  <div className="space-y-1">
                                    <p className="font-medium text-foreground">
                                      {permission.description}
                                    </p>
                                    <Badge variant="outline" className="text-xs">
                                      {permission.name}
                                    </Badge>
                                  </div>
                                  
                                  <Switch
                                    checked={isEnabled}
                                    onCheckedChange={(checked) => {
                                      if (!isRoleLocked) {
                                        togglePermissionMutation.mutate({
                                          permissionId: permission.id,
                                          enabled: checked,
                                        });
                                      }
                                    }}
                                    disabled={isRoleLocked || togglePermissionMutation.isPending}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};