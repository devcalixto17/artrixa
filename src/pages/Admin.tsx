import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Shield, Crown, Sparkles, Award, Trophy, Star, X, Download, Search, Bell, Check, Eye, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database } from "@/integrations/supabase/types";
import { BadgeManager } from "@/components/admin/BadgeManager";
import { ModerationPanel } from "@/components/admin/ModerationPanel";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type AppRole = Database["public"]["Enums"]["app_role"];

const roleConfig: Record<AppRole, { label: string; icon: React.ComponentType<any>; color: string }> = {
  fundador: { label: "Fundadora !.", icon: Crown, color: "text-red-500" },
  admin: { label: "Administrador(a)", icon: Shield, color: "text-yellow-500" },
  staff: { label: "Staff", icon: Sparkles, color: "text-blue-500" },
  user: { label: "Usuário", icon: Users, color: "text-muted-foreground" },
  vip_diamante: { label: "VIP Diamante", icon: Sparkles, color: "text-cyan-400" },
};

const iconMap: Record<string, React.ComponentType<any>> = {
  Award,
  Trophy,
  Star,
  Crown,
  Shield,
  Sparkles,
};

const Admin = () => {
  const { user, isFundador, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (profilesError) throw profilesError;
      
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");
      
      if (rolesError) throw rolesError;
      
      const { data: userBadges, error: badgesError } = await supabase
        .from("user_badges")
        .select("*, badges(*)");
      
      if (badgesError) throw badgesError;
      
      return profiles.map((profile) => ({
        ...profile,
        role: roles.find((r) => r.user_id === profile.user_id)?.role || "user",
        badges: userBadges
          .filter((ub) => ub.user_id === profile.user_id)
          .map((ub) => ub.badges),
      }));
    },
    enabled: !!user && isFundador,
  });
  
  const { data: badges } = useQuery({
    queryKey: ["badges"],
    queryFn: async () => {
      const { data, error } = await supabase.from("badges").select("*");
      if (error) throw error;
      return data;
    },
    enabled: !!user && isFundador,
  });
  
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [usersRes, downloadsRes, categoriesRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("downloads").select("id", { count: "exact", head: true }),
        supabase.from("categories").select("id", { count: "exact", head: true }),
      ]);
      
      return {
        users: usersRes.count || 0,
        downloads: downloadsRes.count || 0,
        categories: categoriesRes.count || 0,
      };
    },
    enabled: !!user && isFundador,
  });
  
  // Filtrar usuários com base na busca
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    if (!searchQuery.trim()) return users;
    
    const query = searchQuery.toLowerCase();
    return users.filter((userData) => 
      (userData.username && userData.username.toLowerCase().includes(query)) ||
      (userData.user_id && userData.user_id.toLowerCase().includes(query))
    );
  }, [users, searchQuery]);

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Cargo atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar cargo: " + error.message);
    },
  });

  const awardBadgeMutation = useMutation({
    mutationFn: async ({ userId, badgeId }: { userId: string; badgeId: string }) => {
      const { error } = await supabase
        .from("user_badges")
        .insert({
          user_id: userId,
          badge_id: badgeId,
          awarded_by: user?.id,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Insígnia adicionada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao adicionar insígnia: " + error.message);
    },
  });

  const removeBadgeMutation = useMutation({
    mutationFn: async ({ userId, badgeId }: { userId: string; badgeId: string }) => {
      const { error } = await supabase
        .from("user_badges")
        .delete()
        .eq("user_id", userId)
        .eq("badge_id", badgeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Insígnia removida com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao remover insígnia: " + error.message);
    },
  });

  if (authLoading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!user || !isFundador) {
    return <Navigate to="/" replace />;
  }

  return (
    <Layout showSidebar={false}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Crown className="w-8 h-8 text-red-500" />
          <h1 className="text-3xl font-display font-bold text-foreground"> Painel do Fundador </h1>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.users || 0}</p>
                <p className="text-sm text-muted-foreground">Usuários</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="p-3 rounded-lg bg-primary/10">
                <Download className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.downloads || 0}</p>
                <p className="text-sm text-muted-foreground">Downloads</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="p-3 rounded-lg bg-primary/10">
                <Award className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{badges?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Insígnias</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="notifications" className="space-y-4">
          <TabsList className="bg-muted">
            <TabsTrigger value="notifications" className="data-[state=active]:bg-background relative">
              <Bell className="w-4 h-4 mr-2" />
              Notificações
              <PendingBadge />
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-background">
              <Users className="w-4 h-4 mr-2" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="moderation" className="data-[state=active]:bg-background">
              <Shield className="w-4 h-4 mr-2" />
              Moderação
            </TabsTrigger>
            <TabsTrigger value="badges" className="data-[state=active]:bg-background">
              <Award className="w-4 h-4 mr-2" />
              Insígnias
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="notifications" className="space-y-4">
            <NotificationsPanel />
          </TabsContent>
          
          <TabsContent value="users" className="space-y-4">
            {/* Role Legend */}
            <Card className="bg-card border-border">
              <CardContent className="py-4">
                <div className="flex flex-wrap gap-4">
                  {Object.entries(roleConfig).map(([role, config]) => {
                    const Icon = config.icon;
                    return (
                      <div key={role} className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${config.color}`} />
                        <span className="text-sm text-muted-foreground">{config.label}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            
            {/* Search Bar */}
            <Card className="bg-card border-border">
              <CardContent className="py-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar usuários por nome ou ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Users List */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Gerenciar Usuários</CardTitle>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20" />
                    ))}
                  </div>
                ) : filteredUsers.length > 0 ? (
                  <div className="space-y-4">
                    {filteredUsers.map((userData) => {
                      const RoleIcon = roleConfig[userData.role as AppRole]?.icon || Users;
                      const roleColor = roleConfig[userData.role as AppRole]?.color || "text-muted-foreground";
                      
                      return (
                        <div
                          key={userData.id}
                          className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-lg bg-muted/50 border border-border"
                        >
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={userData.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/20 text-primary">
                              {userData.username?.[0]?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-foreground truncate">
                                {userData.username || "Usuário"}
                              </p>
                              <RoleIcon className={`w-4 h-4 ${roleColor}`} />
                            </div>
                            
                            {/* User Badges */}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {userData.badges?.map((badge: any) => {
                                if (!badge) return null;
                                const BadgeIcon = iconMap[badge.icon] || Award;
                                return (
                                  <Badge
                                    key={badge.id}
                                    variant="secondary"
                                    className="text-xs flex items-center gap-1"
                                    style={{ borderColor: badge.color }}
                                  >
                                    <BadgeIcon className="w-3 h-3" style={{ color: badge.color }} />
                                    {badge.name}
                                    <button
                                      onClick={() =>
                                        removeBadgeMutation.mutate({
                                          userId: userData.user_id,
                                          badgeId: badge.id,
                                        })
                                      }
                                      className="ml-1 hover:text-destructive"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            {/* Add Badge */}
                            <Select
                              onValueChange={(badgeId) =>
                                awardBadgeMutation.mutate({
                                  userId: userData.user_id,
                                  badgeId,
                                })
                              }
                            >
                              <SelectTrigger className="w-full sm:w-[140px]">
                                <SelectValue placeholder="+ Insígnia" />
                              </SelectTrigger>
                              <SelectContent>
                                {badges
                                  ?.filter((b) => !userData.badges?.some((ub: any) => ub?.id === b.id))
                                  .map((badge) => {
                                    const BadgeIcon = iconMap[badge.icon] || Award;
                                    return (
                                      <SelectItem key={badge.id} value={badge.id}>
                                        <div className="flex items-center gap-2">
                                          <BadgeIcon
                                            className="w-4 h-4"
                                            style={{ color: badge.color }}
                                          />
                                          {badge.name}
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                              </SelectContent>
                            </Select>
                            
                            {/* Change Role */}
                            <Select
                              value={userData.role}
                              onValueChange={(value: AppRole) =>
                                updateRoleMutation.mutate({
                                  userId: userData.user_id,
                                  newRole: value,
                                })
                              }
                            >
                              <SelectTrigger className="w-full sm:w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(roleConfig).map(([role, config]) => {
                                  const Icon = config.icon;
                                  return (
                                    <SelectItem key={role} value={role}>
                                      <div className="flex items-center gap-2">
                                        <Icon className={`w-4 h-4 ${config.color}`} />
                                        {config.label}
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">
                      {searchQuery ? "Nenhum usuário encontrado." : "Nenhum usuário cadastrado."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="moderation" className="space-y-4">
            <ModerationPanel />
          </TabsContent>

          <TabsContent value="badges" className="space-y-4">
            <BadgeManager />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

// Pending downloads badge component
const PendingBadge = () => {
  const { data: count } = useQuery({
    queryKey: ["pending-downloads-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("downloads")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) return 0;
      return count || 0;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (!count || count === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
      {count > 9 ? "9+" : count}
    </span>
  );
};

// Notifications Panel component
const NotificationsPanel = () => {
  const queryClient = useQueryClient();

  const { data: pendingDownloads, isLoading } = useQuery({
    queryKey: ["pending-downloads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("downloads")
        .select(
          `
          *,
          categories(name, slug)
        `
        )
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const authorIds = [...new Set(data?.map((d) => d.author_id).filter(Boolean))];

      let profiles: Record<string, { username: string | null; avatar_url: string | null; user_id: string }> = {};

      if (authorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, username, avatar_url")
          .in("user_id", authorIds);

        if (profilesData) {
          profiles = profilesData.reduce((acc, p) => {
            acc[p.user_id] = p;
            return acc;
          }, {} as Record<string, { username: string | null; avatar_url: string | null; user_id: string }>);
        }
      }

      return data?.map((download) => ({
        ...download,
        author: download.author_id ? profiles[download.author_id] : null,
      }));
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("downloads").update({ status: "approved" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-downloads"] });
      queryClient.invalidateQueries({ queryKey: ["pending-downloads-count"] });
      queryClient.invalidateQueries({ queryKey: ["recent-downloads"] });
      queryClient.invalidateQueries({ queryKey: ["downloads"] });
      queryClient.invalidateQueries({ queryKey: ["downloads-by-category"] });
      queryClient.invalidateQueries({ queryKey: ["skins-downloads"] });
      toast.success("Publicação aprovada!");
    },
    onError: (error) => {
      toast.error("Erro: " + error.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("downloads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-downloads"] });
      queryClient.invalidateQueries({ queryKey: ["pending-downloads-count"] });
      queryClient.invalidateQueries({ queryKey: ["recent-downloads"] });
      queryClient.invalidateQueries({ queryKey: ["downloads"] });
      queryClient.invalidateQueries({ queryKey: ["downloads-by-category"] });
      queryClient.invalidateQueries({ queryKey: ["skins-downloads"] });

      toast.success("Publicação rejeitada e removida do site.");
    },
    onError: (error) => {
      toast.error("Erro: " + error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (!pendingDownloads?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Bell className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Nenhuma publicação pendente de aprovação</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Publicações Pendentes
            </CardTitle>
            <CardDescription>{pendingDownloads.length} publicação(ões) aguardando aprovação</CardDescription>
          </CardHeader>
        </Card>

        {pendingDownloads.map((download) => (
          <Card key={download.id}>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                {download.image_url && (
                  <div className="w-full md:w-48 aspect-video rounded-lg overflow-hidden shrink-0">
                    <img src={download.image_url} alt={download.title} className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold">{download.title}</h3>
                      {download.categories && (
                        <Badge variant="secondary" className="mt-1">
                          {download.categories.name}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Link to={`/download/${download.id}`}>
                        <Button variant="outline" size="sm" className="gap-1">
                          <Eye className="h-4 w-4" />
                          Ver
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="default"
                        className="gap-1"
                        onClick={() => approveMutation.mutate(download.id)}
                        disabled={approveMutation.isPending}
                      >
                        <Check className="h-4 w-4" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1"
                        onClick={() => rejectMutation.mutate(download.id)}
                        disabled={rejectMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                        Rejeitar
                      </Button>
                    </div>
                  </div>

                  <p className="text-muted-foreground line-clamp-2">
                    {download.description ? (
                      <span dangerouslySetInnerHTML={{ __html: download.description.substring(0, 200) }} />
                    ) : (
                      "Sem descrição"
                    )}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {download.author && (
                      <Link to={`/profile/${download.author.user_id}`} className="flex items-center gap-2 hover:text-foreground">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={download.author.avatar_url || undefined} />
                          <AvatarFallback>
                            <Users className="h-3 w-3" />
                          </AvatarFallback>
                        </Avatar>
                        {download.author.username || "Usuário"}
                      </Link>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(download.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

    </>
  );
};

export default Admin;