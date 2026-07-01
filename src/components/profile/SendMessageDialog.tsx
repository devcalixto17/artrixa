import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send } from "lucide-react";

interface SendMessageDialogProps {
  recipientId: string;
  recipientName: string;
}

export function SendMessageDialog({ recipientId, recipientName }: SendMessageDialogProps) {
  const { user, isFundador } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");
      
      const { error } = await supabase.from("private_messages").insert({
        sender_id: user.id,
        recipient_id: recipientId,
        subject,
        content,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["private-messages"] });
      setOpen(false);
      setSubject("");
      setContent("");
      toast({
        title: "Mensagem enviada!",
        description: `Sua mensagem foi enviada para ${recipientName}.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Only show for fundador and not on own profile
  if (!isFundador || user?.id === recipientId) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          Enviar Mensagem
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar Mensagem Privada</DialogTitle>
          <DialogDescription>
            Envie uma mensagem privada para {recipientName}. Apenas você e o destinatário poderão ver esta mensagem.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Assunto *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Assunto da mensagem"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Mensagem *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escreva sua mensagem..."
              rows={5}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => sendMessageMutation.mutate()}
            disabled={!subject.trim() || !content.trim() || sendMessageMutation.isPending}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {sendMessageMutation.isPending ? "Enviando..." : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
