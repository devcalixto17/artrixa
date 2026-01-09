import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useModeration } from "@/hooks/useModeration";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, User, VolumeX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CommentItem } from "./CommentItem";

interface Comment {
  id: string;
  user_id: string;
  download_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  profile?: {
    username: string | null;
    avatar_url: string | null;
  };
  replies?: Comment[];
}

interface CommentSectionProps {
  downloadId: string;
}

export const CommentSection = ({ downloadId }: CommentSectionProps) => {
  const [newComment, setNewComment] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [currentReplyContent, setCurrentReplyContent] = useState("");
  const { user, isFundador } = useAuth();
  const { isMuted } = useModeration();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch comments
  const { data: comments, isLoading } = useQuery<Comment[]>({
    queryKey: ["comments", downloadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*, updated_at") // Selecionando updated_at
        .eq("download_id", downloadId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch profiles for all users
      const userIds = [...new Set(data?.map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(
        profiles?.map((p) => [p.user_id, p]) || []
      );

      // Organize comments into threads
      const commentsWithProfiles = data?.map((comment) => ({
        ...comment,
        profile: profileMap.get(comment.user_id),
      }));

      // Separate parent and child comments
      const parentComments: Comment[] = [];
      const childComments: Comment[] = [];

      commentsWithProfiles?.forEach((comment) => {
        if (comment.parent_id) {
          childComments.push(comment);
        } else {
          parentComments.push({ ...comment, replies: [] });
        }
      });

      // Attach replies to parents
      parentComments.forEach((parent) => {
        parent.replies = childComments.filter((c) => c.parent_id === parent.id);
      });

      return parentComments;
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      if (!user) throw new Error("Not authenticated");
      // Garante que content é uma string e não está vazia após trim
      const trimmedContent = content?.trim() || '';
      if (!trimmedContent) throw new Error("O conteúdo do comentário não pode ser vazio."); 

      const { error } = await supabase.from("comments").insert({
        user_id: user.id,
        download_id: downloadId,
        parent_id: parentId || null,
        content: trimmedContent,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", downloadId] });
      setNewComment("");
      setCurrentReplyContent(""); // Clear reply content after successful submission
      setReplyingToId(null); // Close reply box
      toast({ title: "Comentário adicionado!" });
    },
    onError: (error) => {
      console.error("Erro ao adicionar comentário:", error);
      toast({
        title: "Erro",
        description: `Não foi possível adicionar o comentário: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update comment mutation
  const updateCommentMutation = useMutation({
    mutationFn: async ({ commentId, newContent }: { commentId: string; newContent: string }) => {
      if (!user) throw new Error("Not authenticated");
      // Garante que newContent é uma string e não está vazia após trim
      const trimmedNewContent = newContent?.trim() || '';
      if (!trimmedNewContent) throw new Error("O conteúdo do comentário não pode ser vazio."); 

      const { error } = await supabase
        .from("comments")
        .update({ content: trimmedNewContent, updated_at: new Date().toISOString() })
        .eq("id", commentId)
        .eq("user_id", user.id); // Garante que apenas o autor pode editar
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", downloadId] });
      toast({ title: "Comentário editado!" });
    },
    onError: (error) => {
      console.error("Erro ao editar comentário:", error);
      toast({
        title: "Erro",
        description: `Não foi possível editar o comentário: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", downloadId] });
      toast({ title: "Comentário excluído!" });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o comentário.",
        variant: "destructive",
      });
    },
  });

  const handleNewCommentSubmit = () => {
    if (!user) {
      toast({
        title: "Login Necessário",
        description: "Você precisa estar logado para comentar.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (isMuted) {
      toast({
        title: "Você está silenciado",
        description: "Você não pode comentar enquanto estiver silenciado.",
        variant: "destructive",
      });
      return;
    }

    const contentToSubmit = newComment?.trim() || '';
    if (!contentToSubmit) {
      toast({
        title: "Erro",
        description: "O conteúdo do comentário não pode ser vazio.",
        variant: "destructive",
      });
      return;
    }

    addCommentMutation.mutate({ content: contentToSubmit });
  };

  const isCommentDisabled = !user || isMuted;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="h-5 w-5" />
          Comentários ({comments?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New Comment Form */}
        <div className="flex gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            {isMuted ? (
              <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive">
                <VolumeX className="h-5 w-5" />
                <span>Você está silenciado e não pode comentar.</span>
              </div>
            ) : (
              <>
                <Textarea
                  placeholder={user ? "Escreva um comentário..." : "Faça login para comentar"}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={isCommentDisabled}
                  className="min-h-[80px]"
                />
                <Button
                  onClick={handleNewCommentSubmit}
                  disabled={!(newComment?.trim()) || addCommentMutation.isPending || isCommentDisabled}
                >
                  {addCommentMutation.isPending ? "Enviando..." : "Comentar"}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Comments List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : comments && comments.length > 0 ? (
          <div className="space-y-4 pt-4 border-t">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUser={user}
                isCurrentUserFundador={isFundador}
                onDeleteComment={deleteCommentMutation.mutate}
                onAddReply={addCommentMutation.mutate}
                isAddingComment={addCommentMutation.isPending}
                onEditComment={updateCommentMutation.mutate} // Passando a mutação de edição
                isUpdatingComment={updateCommentMutation.isPending} // Passando o estado de loading da edição
                navigate={navigate}
                toast={toast}
                replyingToId={replyingToId}
                setReplyingToId={setReplyingToId}
                currentReplyContent={currentReplyContent}
                setCurrentReplyContent={setCurrentReplyContent}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum comentário ainda. Seja o primeiro a comentar!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};