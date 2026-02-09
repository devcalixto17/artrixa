import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Ban,
  VolumeX,
  LogOut,
  Search,
  Shield,
  Clock,
  AlertTriangle,
  Check,
  X,
  User
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow, addHours, addDays, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UserModeration {
  id: string;
  user_id: string;
  moderation_type: "ban" | "mute" | "kick";
  reason: string;
  applied_by: string;
  applied_at: string;
  expires_at: string | null;
  is_permanent: boolean;
  is_active: boolean;
  profile?: {
    username: string | null;
    avatar_url: string | null;
  };
  applied_by_profile?: {
    username: string | null;
  };
}

const DURATION_OPTIONS = [
  { label: "1 hora", value: "1h", hours: 1 },
  { label: "3 horas", value: "3h", hours: 3 },
  { label: "10 horas", value: "10h", hours: 10 },
  { label: "3 dias", value: "3d", hours: 72 },
  { label: "Permanente", value: "permanent", hours: 0 },
];

export const ModerationPanel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [moderationType, setModerationType] = useState<"ban" | "mute" | "kick">("mute");
  const [duration, setDuration] = useState("1h");
  const [reason, setReason] = useState("");

  // Fetch all users
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["moderation-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("username");
      if (error) throw error;
      return data;
    },
  });

  // Fetch active moderations
  const { data: activeModerations, isLoading: moderationsLoading } = useQuery({
    queryKey: ["active-moderations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_moderations")
        .select("*")
        .eq("is_active", true)
        .order("applied_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles for moderated users and moderators
      const userIds = [...new Set([
        ...data.map(m => m.user_id),
        ...data.map(m => m.applied_by)
      ])];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return data.map(m => ({
        ...m,
        profile: profileMap.get(m.user_id),
        applied_by_profile: profileMap.get(m.applied_by),
      }));
    },
  });

  // Fetch moderation history
  const { data: moderationHistory } = useQuery({
    queryKey: ["moderation-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_moderations")
        .select("*")
        .order("applied_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const userIds = [...new Set([
        ...data.map(m => m.user_id),
        ...data.map(m => m.applied_by)
      ])];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return data.map(m => ({
        ...m,
        profile: profileMap.get(m.user_id),
        applied_by_profile: profileMap.get(m.applied_by),
      }));
    },
  });

  // Apply moderation mutation
  const applyModerationMutation = useMutation({
    mutationFn: async ({ userId, type, reason, durationValue }: {
      userId: string;
      type: "ban" | "mute" | "kick";
      reason: string;
      durationValue: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const durationOption = DURATION_OPTIONS.find(d => d.value === durationValue);
      const isPermanent = durationValue === "permanent";
      const expiresAt = isPermanent ? null : addHours(new Date(), durationOption?.hours || 1);

      // For kick, we don't store duration
      const { error } = await supabase
        .from("user_moderations")
        .insert({
          user_id: userId,
          moderation_type: type,
          reason,
          applied_by: user.id,
          expires_at: type === "kick" ? null : expiresAt?.toISOString(),
          is_permanent: type === "kick" ? false : isPermanent,
          is_active: true, // All moderations (including kicks) start active
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-moderations"] });
      queryClient.invalidateQueries({ queryKey: ["moderation-history"] });
      setSelectedUserId(null);
      setReason("");
      toast.success("Punição aplicada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao aplicar punição: " + error.message);
    },
  });

  // Remove moderation mutation
  const removeModerationMutation = useMutation({
    mutationFn: async (moderationId: string) => {
      const { error } = await supabase
        .from("user_moderations")
        .update({ is_active: false })
        .eq("id", moderationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-moderations"] });
      queryClient.invalidateQueries({ queryKey: ["moderation-history"] });
      toast.success("Punição removida com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao remover punição: " + error.message);
    },
  });

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchQuery.trim()) return users;

    const query = searchQuery.toLowerCase();
    return users.filter(u =>
      u.username?.toLowerCase().includes(query) ||
      u.user_id.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const selectedUser = users?.find(u => u.user_id === selectedUserId);

  const getModerationIcon = (type: string) => {
    switch (type) {
      case "ban": return <Ban className="w-4 h-4 text-red-500" />;
      case "mute": return <VolumeX className="w-4 h-4 text-yellow-500" />;
      case "kick": return <LogOut className="w-4 h-4 text-blue-500" />;
      default: return null;
    }
  };

  const getModerationBadge = (type: string) => {
    switch (type) {
      case "ban": return <Badge variant="destructive">Banido</Badge>;
      case "mute": return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500">Mutado</Badge>;
      case "kick": return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500">Kickado</Badge>;
      default: return null;
    }
  };

  const handleApplyModeration = () => {
    if (!selectedUserId || !reason.trim()) {
      toast.error("Selecione um usuário e informe o motivo.");
      return;
    }

    applyModerationMutation.mutate({
      userId: selectedUserId,
      type: moderationType,
      reason: reason.trim(),
      durationValue: duration,
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="apply" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="apply" className="data-[state=active]:bg-background">
            <Shield className="w-4 h-4 mr-2" />
            Aplicar Punição
          </TabsTrigger>
          <TabsTrigger value="active" className="data-[state=active]:bg-background">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Punições Ativas ({activeModerations?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-background">
            <Clock className="w-4 h-4 mr-2" />
            Histórico
          </TabsTrigger>
        </TabsList>

        {/* Apply Moderation Tab */}
        <TabsContent value="apply" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Aplicar Nova Punição
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Users */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuário por nome..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* User Selection */}
              {searchQuery && (
                <div className="max-h-48 overflow-y-auto border rounded-lg">
                  {usersLoading ? (
                    <div className="p-4">
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <p className="p-4 text-center text-muted-foreground">Nenhum usuário encontrado</p>
                  ) : (
                    filteredUsers.slice(0, 10).map((u) => (
                      <button
                        key={u.user_id}
                        onClick={() => {
                          setSelectedUserId(u.user_id);
                          setSearchQuery("");
                        }}
                        className={`w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors ${selectedUserId === u.user_id ? "bg-primary/10" : ""
                          }`}
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

              {/* Selected User */}
              {selectedUser && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedUser.avatar_url || undefined} />
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{selectedUser.username || "Usuário"}</p>
                    <p className="text-xs text-muted-foreground">Selecionado para punição</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedUserId(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Moderation Type */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={moderationType === "mute" ? "default" : "outline"}
                  onClick={() => setModerationType("mute")}
                  className="flex items-center gap-2"
                >
                  <VolumeX className="h-4 w-4" />
                  Mute
                </Button>
                <Button
                  variant={moderationType === "ban" ? "destructive" : "outline"}
                  onClick={() => setModerationType("ban")}
                  className="flex items-center gap-2"
                >
                  <Ban className="h-4 w-4" />
                  Ban
                </Button>
                <Button
                  variant={moderationType === "kick" ? "secondary" : "outline"}
                  onClick={() => setModerationType("kick")}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Kick
                </Button>
              </div>

              {/* Duration (not for kick) */}
              {moderationType !== "kick" && (
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue placeholder="Duração da punição" />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Reason */}
              <Textarea
                placeholder="Motivo da punição..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[100px]"
              />

              {/* Apply Button */}
              <Button
                onClick={handleApplyModeration}
                disabled={!selectedUserId || !reason.trim() || applyModerationMutation.isPending}
                className="w-full"
                variant={moderationType === "ban" ? "destructive" : "default"}
              >
                {applyModerationMutation.isPending ? "Aplicando..." : "Aplicar Punição"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Moderations Tab */}
        <TabsContent value="active" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Punições Ativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {moderationsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : activeModerations?.length === 0 ? (
                <div className="text-center py-8">
                  <Check className="w-12 h-12 mx-auto text-green-500 mb-3" />
                  <p className="text-muted-foreground">Nenhuma punição ativa no momento.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeModerations?.map((mod) => (
                    <div
                      key={mod.id}
                      className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg border"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={mod.profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{mod.profile?.username || "Usuário"}</span>
                          {getModerationBadge(mod.moderation_type)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{mod.reason}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Por: {mod.applied_by_profile?.username || "Sistema"}</span>
                          <span>
                            {mod.is_permanent ? (
                              "Permanente"
                            ) : mod.expires_at ? (
                              isPast(new Date(mod.expires_at)) ? (
                                "Expirado"
                              ) : (
                                `Expira ${formatDistanceToNow(new Date(mod.expires_at), { locale: ptBR, addSuffix: true })}`
                              )
                            ) : (
                              "—"
                            )}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeModerationMutation.mutate(mod.id)}
                        disabled={removeModerationMutation.isPending}
                      >
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Histórico de Moderação
              </CardTitle>
            </CardHeader>
            <CardContent>
              {moderationHistory?.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nenhuma ação de moderação registrada.</p>
              ) : (
                <div className="space-y-2">
                  {moderationHistory?.map((mod) => (
                    <div
                      key={mod.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${mod.is_active ? "bg-muted/50" : "opacity-60"
                        }`}
                    >
                      {getModerationIcon(mod.moderation_type)}
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={mod.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {mod.profile?.username?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{mod.profile?.username || "Usuário"}</span>
                      <span className="text-xs text-muted-foreground flex-1 truncate">
                        {mod.reason}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(mod.applied_at), "dd/MM/yy HH:mm")}
                      </span>
                      {!mod.is_active && (
                        <Badge variant="outline" className="text-xs">
                          Inativo
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
