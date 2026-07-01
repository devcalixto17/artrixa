import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Send, Mail, MailOpen, Trash2, Pencil, Check, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export function SentMessagesPanel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editContent, setEditContent] = useState("");

  const { data: sentMessages, isLoading } = useQuery({
    queryKey: ["sent-messages", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("private_messages")
        .select("*")
        .eq("sender_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch recipient profiles
      const recipientIds = [...new Set(data?.map(m => m.recipient_id) || [])];
      if (recipientIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, avatar_url")
          .in("user_id", recipientIds);
        
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        return data?.map(m => ({
          ...m,
          recipient: profileMap.get(m.recipient_id),
        })) || [];
      }

      return data?.map(m => ({ ...m, recipient: null })) || [];
    },
    enabled: !!user,
  });

  // Delete for recipient (removes from their view)
  const deleteForRecipientMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("private_messages")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sent-messages"] });
      toast.success("Mensagem apagada!");
    },
    onError: (error) => {
      toast.error("Erro ao apagar: " + error.message);
    },
  });

  // Edit message
  const editMessageMutation = useMutation({
    mutationFn: async ({ id, subject, content }: { id: string; subject: string; content: string }) => {
      const { error } = await supabase
        .from("private_messages")
        .update({ subject, content })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sent-messages"] });
      setEditingMessage(null);
      toast.success("Mensagem editada!");
    },
    onError: (error) => {
      toast.error("Erro ao editar: " + error.message);
    },
  });

  const openEdit = (msg: any) => {
    setEditingMessage(msg);
    setEditSubject(msg.subject);
    setEditContent(msg.content);
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Mensagens Enviadas
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

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Mensagens Enviadas
          </CardTitle>
          <CardDescription>
            Gerencie as mensagens que você enviou para outros usuários.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!sentMessages || sentMessages.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Nenhuma mensagem enviada</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3 pr-4">
                {sentMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      msg.read
                        ? "bg-muted/30 border-border"
                        : "bg-primary/5 border-primary/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        {msg.read ? (
                          <MailOpen className="h-4 w-4 text-muted-foreground mt-1" />
                        ) : (
                          <Mail className="h-4 w-4 text-primary mt-1" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{msg.subject}</span>
                            {msg.read ? (
                              <Badge variant="outline" className="text-xs">Lida</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Não lida</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Para: <span className="font-medium">{msg.recipient?.username || "Usuário"}</span>
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-2">{msg.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(msg.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(msg)}
                          title="Editar mensagem"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteForRecipientMutation.mutate(msg.id)}
                          title="Apagar mensagem"
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

      {/* Edit Dialog */}
      <Dialog open={!!editingMessage} onOpenChange={(open) => !open && setEditingMessage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Mensagem</DialogTitle>
            <DialogDescription>
              Edite o assunto e conteúdo da mensagem enviada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-subject">Assunto</Label>
              <Input
                id="edit-subject"
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-content">Mensagem</Label>
              <Textarea
                id="edit-content"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMessage(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (editingMessage) {
                  editMessageMutation.mutate({
                    id: editingMessage.id,
                    subject: editSubject,
                    content: editContent,
                  });
                }
              }}
              disabled={!editSubject.trim() || !editContent.trim() || editMessageMutation.isPending}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              {editMessageMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}