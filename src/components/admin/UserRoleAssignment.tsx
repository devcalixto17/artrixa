import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Search, User, UserPlus, X, Crown, Shield, Star } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const APP_ROLES: { value: AppRole; label: string; color: string }[] = [
  { value: "fundador", label: "Fundador", color: "#ef4444" },
  { value: "admin", label: "Administrador", color: "#f59e0b" },
  { value: "staff", label: "Staff", color: "#3b82f6" },
  { value: "vip_diamante", label: "VIP Diamante", color: "#06b6d4" },
  { value: "user", label: "Usuário", color: "#6b7280" },
];

export const UserRoleAssignment = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedAppRole, setSelectedAppRole] = useState<AppRole | "">("");
  const [selectedCustomRoleId, setSelectedCustomRoleId] = useState<string>("");

  // Fetch all users
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["all-users-for-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("username");
      if (error) throw error;
      return data;
    },
  });

  // Fetch custom roles
  const { data: customRoles } = useQuery({
    queryKey: ["custom-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_roles")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  // Fetch user's current roles
  const { data: userRoles, refetch: refetchUserRoles } = useQuery({
    queryKey: ["user-roles-detail", selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return null;

      // Get app role
      const { data: appRoleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", selectedUserId)
        .maybeSingle();

      // Get custom roles
      const { data: customRolesData } = await supabase
        .from("user_custom_roles")
        .select("*, custom_roles(*)")
        .eq("user_id", selectedUserId);

      return {
        appRole: appRoleData?.role || "user",
        customRoles: customRolesData?.map(ucr => ucr.custom_roles) || [],
      };
    },
    enabled: !!selectedUserId,
  });

  // Assign app role
  const assignAppRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // First, delete existing role
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      // Then insert new role
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-roles-detail", selectedUserId] });
      toast.success("Cargo do sistema atribuído com sucesso!");
      setSelectedAppRole("");
    },
    onError: (error: any) => {
      console.error("Erro ao atribuir cargo:", error);
      toast.error(error.message || "Erro ao atribuir cargo");
    },
  });

  // Assign custom role
  const assignCustomRoleMutation = useMutation({
    mutationFn: async ({ userId, customRoleId }: { userId: string; customRoleId: string }) => {
      const { error } = await supabase
        .from("user_custom_roles")
        .insert({ user_id: userId, custom_role_id: customRoleId });

      if (error) {
        if (error.code === "23505") {
          throw new Error("Usuário já possui este cargo");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-roles-detail", selectedUserId] });
      toast.success("Cargo personalizado atribuído!");
      setSelectedCustomRoleId("");
    },
    onError: (error: any) => {
      console.error("Erro ao atribuir cargo:", error);
      toast.error(error.message || "Erro ao atribuir cargo");
    },
  });

  // Remove custom role
  const removeCustomRoleMutation = useMutation({
    mutationFn: async ({ userId, customRoleId }: { userId: string; customRoleId: string }) => {
      const { error } = await supabase
        .from("user_custom_roles")
        .delete()
        .eq("user_id", userId)
        .eq("custom_role_id", customRoleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-roles-detail", selectedUserId] });
      toast.success("Cargo removido!");
    },
    onError: () => {
      toast.error("Erro ao remover cargo");
    },
  });

  // Filter users
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchQuery.trim()) return users.slice(0, 20);

    const query = searchQuery.toLowerCase();
    return users.filter(u =>
      u.username?.toLowerCase().includes(query) ||
      u.user_id.toLowerCase().includes(query)
    ).slice(0, 20);
  }, [users, searchQuery]);

  const selectedUser = users?.find(u => u.user_id === selectedUserId);

  // Available custom roles (not yet assigned)
  const availableCustomRoles = useMemo(() => {
    if (!customRoles || !userRoles) return customRoles || [];
    const assignedIds = userRoles.customRoles.map((r: any) => r?.id);
    return customRoles.filter(r => !assignedIds.includes(r.id));
  }, [customRoles, userRoles]);

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Atribuir Cargos a Usuários
          </CardTitle>
          <CardDescription>
            Selecione um usuário e atribua cargos do sistema ou personalizados.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* User Search */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuário por nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* User List */}
            {searchQuery && (
              <div className="max-h-48 overflow-y-auto border rounded-lg">
                {usersLoading ? (
                  <Skeleton className="h-12 m-2" />
                ) : filteredUsers.length === 0 ? (
                  <p className="p-4 text-center text-muted-foreground">Nenhum usuário encontrado</p>
                ) : (
                  filteredUsers.map((u) => (
                    <button
                      key={u.user_id}
                      onClick={() => {
                        setSelectedUserId(u.user_id);
                        setSearchQuery("");
                      }}
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors border-b last:border-b-0"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={u.avatar_url || undefined} />
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{u.username || "Usuário"}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Selected User */}
          {selectedUser && (
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedUser.avatar_url || undefined} />
                  <AvatarFallback>
                    <User className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-lg">{selectedUser.username || "Usuário"}</p>
                  <p className="text-sm text-muted-foreground">ID: {selectedUser.user_id.slice(0, 8)}...</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedUserId(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Current Roles */}
              {userRoles && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Cargos Atuais:</p>
                  <div className="flex flex-wrap gap-2">
                    {/* App Role */}
                    <Badge
                      className="flex items-center gap-1"
                      style={{
                        backgroundColor: `${APP_ROLES.find(r => r.value === userRoles.appRole)?.color}20`,
                        borderColor: APP_ROLES.find(r => r.value === userRoles.appRole)?.color,
                        color: APP_ROLES.find(r => r.value === userRoles.appRole)?.color,
                      }}
                    >
                      <Crown className="w-3 h-3" />
                      {APP_ROLES.find(r => r.value === userRoles.appRole)?.label}
                    </Badge>

                    {/* Custom Roles */}
                    {userRoles.customRoles.map((role: any) => (
                      <Badge
                        key={role?.id}
                        className="flex items-center gap-1 cursor-pointer hover:opacity-80"
                        style={{
                          backgroundColor: `${role?.color}20`,
                          borderColor: role?.color,
                          color: role?.color,
                        }}
                        onClick={() => {
                          if (role?.id) {
                            removeCustomRoleMutation.mutate({
                              userId: selectedUserId!,
                              customRoleId: role.id,
                            });
                          }
                        }}
                      >
                        <Star className="w-3 h-3" />
                        {role?.name}
                        <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Assign App Role */}
              <div className="grid gap-3 pt-4 border-t">
                <p className="text-sm font-medium">Cargo do Sistema:</p>
                <div className="flex gap-2">
                  <Select
                    value={selectedAppRole}
                    onValueChange={(v) => setSelectedAppRole(v as AppRole)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione um cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      {APP_ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          <span style={{ color: role.color }}>{role.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => {
                      if (selectedAppRole && selectedUserId) {
                        assignAppRoleMutation.mutate({
                          userId: selectedUserId,
                          role: selectedAppRole,
                        });
                      }
                    }}
                    disabled={!selectedAppRole || assignAppRoleMutation.isPending}
                  >
                    Atribuir
                  </Button>
                </div>
              </div>

              {/* Assign Custom Role */}
              {availableCustomRoles && availableCustomRoles.length > 0 && (
                <div className="grid gap-3 pt-4 border-t">
                  <p className="text-sm font-medium">Cargo Personalizado:</p>
                  <div className="flex gap-2">
                    <Select
                      value={selectedCustomRoleId}
                      onValueChange={setSelectedCustomRoleId}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione um cargo" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCustomRoles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            <span style={{ color: role.color || undefined }}>{role.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => {
                        if (selectedCustomRoleId && selectedUserId) {
                          assignCustomRoleMutation.mutate({
                            userId: selectedUserId,
                            customRoleId: selectedCustomRoleId,
                          });
                        }
                      }}
                      disabled={!selectedCustomRoleId || assignCustomRoleMutation.isPending}
                    >
                      Adicionar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!selectedUser && (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Busque e selecione um usuário para gerenciar seus cargos</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
