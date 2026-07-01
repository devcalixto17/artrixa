import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Mail, MailOpen, Trash2, AlertCircle, Info, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export function NotificationsSection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["user-notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: privateMessages } = useQuery({
    queryKey: ["private-messages", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("private_messages")
        .select("*")
        .eq("recipient_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_notifications")
        .update({ read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
    },
  });

  const markMessageAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("private_messages")
        .update({ read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["private-messages"] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_notifications")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
      toast.success("Notificação apagada!");
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("private_messages")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["private-messages"] });
      toast.success("Mensagem apagada!");
    },
    onError: (error) => {
      toast.error("Erro ao apagar mensagem: " + error.message);
    },
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "rejection":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-primary" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "rejection":
        return <Badge variant="destructive">Rejeição</Badge>;
      case "success":
        return <Badge className="bg-green-500/20 text-green-500">Sucesso</Badge>;
      case "moderation":
        return <Badge variant="secondary">Moderação</Badge>;
      default:
        return <Badge variant="outline">Info</Badge>;
    }
  };

  const unreadNotifications = notifications?.filter((n) => !n.read).length || 0;
  const unreadMessages = privateMessages?.filter((m) => !m.read).length || 0;

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notificações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const allItems = [
    ...(notifications || []).map((n) => ({ ...n, itemType: "notification" as const })),
    ...(privateMessages || []).map((m) => ({ ...m, itemType: "message" as const, type: "message" })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notificações
          </div>
          {(unreadNotifications > 0 || unreadMessages > 0) && (
            <Badge variant="destructive">
              {unreadNotifications + unreadMessages} não lida{unreadNotifications + unreadMessages > 1 ? "s" : ""}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {allItems.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Nenhuma notificação</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3 pr-4">
              {allItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    item.read
                      ? "bg-muted/30 border-border"
                      : "bg-primary/5 border-primary/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      {item.itemType === "message" ? (
                        item.read ? (
                          <MailOpen className="h-4 w-4 text-muted-foreground mt-1" />
                        ) : (
                          <Mail className="h-4 w-4 text-primary mt-1" />
                        )
                      ) : (
                        getTypeIcon(item.type)
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {item.itemType === "message" ? (item as any).subject : item.title}
                          </span>
                          {item.itemType === "message" ? (
                            <Badge variant="secondary">Mensagem Privada</Badge>
                          ) : (
                            getTypeBadge(item.type)
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {item.itemType === "message" ? (item as any).content : item.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {!item.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            if (item.itemType === "message") {
                              markMessageAsReadMutation.mutate(item.id);
                            } else {
                              markAsReadMutation.mutate(item.id);
                            }
                          }}
                        >
                          <MailOpen className="h-4 w-4" />
                        </Button>
                      )}
                      {/* Delete button for both notifications and messages */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (item.itemType === "message") {
                            deleteMessageMutation.mutate(item.id);
                          } else {
                            deleteNotificationMutation.mutate(item.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}