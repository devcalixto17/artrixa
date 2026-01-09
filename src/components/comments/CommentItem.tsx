import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Reply, Trash2, User, Edit } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { UserHoverCard } from "@/components/profile/UserHoverCard";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Comment {
  id: string;
  user_id: string;
  download_id: string;
  parent_id: string | null;
  content: string | null; // Pode ser null do banco de dados
  created_at: string;
  updated_at: string;
  profile?: {
    username: string | null;
    avatar_url: string | null;
  };
  replies?: Comment[];
}

interface CommentItemProps {
  comment: Comment;
  isReply?: boolean;
  currentUser: SupabaseUser | null;
  isCurrentUserFundador: boolean;
  onDeleteComment: (commentId: string) => void;
  onAddReply: (args: { content: string; parentId?: string }) => void;
  isAddingComment: boolean;
  onEditComment: (args: { commentId: string; newContent: string }) => void;
  isUpdatingComment: boolean;
  navigate: ReturnType<typeof useNavigate>;
  toast: ReturnType<typeof useToast>['toast'];

  replyingToId: string | null;
  setReplyingToId: (id: string | null) => void;
  currentReplyContent: string;
  setCurrentReplyContent: (content: string) => void;
}

export const CommentItem = React.memo(({
  comment,
  isReply = false,
  currentUser,
  isCurrentUserFundador,
  onDeleteComment,
  onAddReply,
  isAddingComment,
  onEditComment,
  isUpdatingComment,
  navigate,
  toast,
  replyingToId,
  setReplyingToId,
  currentReplyContent,
  setCurrentReplyContent,
}: CommentItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  // Inicializa editedContent já trimado
  const [editedContent, setEditedContent] = useState<string>(comment.content?.trim() ?? "");
  const isThisCommentBeingRepliedTo = replyingToId === comment.id;

  const isOwnComment = currentUser?.id === comment.user_id;

  const canDelete = (comment: Comment) => {
    return isOwnComment || isCurrentUserFundador;
  };

  const handleReplyClick = () => {
    if (!currentUser) {
      toast({
        title: "Login Necessário",
        description: "Você precisa estar logado para responder.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    if (isThisCommentBeingRepliedTo) {
      setReplyingToId(null);
      setCurrentReplyContent("");
    } else {
      setReplyingToId(comment.id);
      setCurrentReplyContent("");
    }
  };

  const handleReplySubmit = () => {
    const contentToSubmit = currentReplyContent.trim();
    if (!contentToSubmit) {
      toast({
        title: "Erro",
        description: "O conteúdo da resposta não pode ser vazio.",
        variant: "destructive",
      });
      return;
    }
    onAddReply({ content: contentToSubmit, parentId: comment.id });
  };

  const handleCancelReply = () => {
    setReplyingToId(null);
    setCurrentReplyContent("");
  };

  const handleEditSubmit = () => {
    // editedContent já está trimado devido ao onChange
    const trimmedOriginalContent = comment.content?.trim() || '';

    if (!editedContent) { // Verifica editedContent diretamente
      toast({
        title: "Erro",
        description: "O conteúdo do comentário não pode ser vazio.",
        variant: "destructive",
      });
      return;
    }
    if (editedContent !== trimmedOriginalContent) {
      onEditComment({ commentId: comment.id, newContent: editedContent });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(comment.content?.trim() ?? ""); // Reverte para o conteúdo original trimado
  };

  const wasEdited = comment.updated_at && comment.updated_at !== comment.created_at;

  return (
    <div className={`flex gap-3 ${isReply ? "ml-10 mt-3" : ""}`}>
      <UserHoverCard userId={comment.user_id}>
        <Avatar className="h-8 w-8 cursor-pointer">
          <AvatarImage src={comment.profile?.avatar_url || undefined} />
          <AvatarFallback>
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      </UserHoverCard>

      <div className="flex-1">
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <UserHoverCard userId={comment.user_id}>
              <span className="font-medium text-sm cursor-pointer hover:text-primary transition-colors">
                {comment.profile?.username || "Usuário"}
              </span>
            </UserHoverCard>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              {format(new Date(comment.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              {wasEdited && (
                <span className="italic text-blue-400">
                  (Editado em {format(new Date(comment.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })})
                </span>
              )}
            </span>
          </div>
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value.trim())} // Trim no onChange
                className="min-h-[60px] text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleEditSubmit}
                  // Compara editedContent (já trimado) com o original trimado
                  disabled={!editedContent || (editedContent === (comment.content?.trim() || '')) || isUpdatingComment}
                >
                  {isUpdatingComment ? "Salvando..." : "Salvar"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelEdit}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-foreground">{comment.content || ""}</p>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1">
          {!isReply && currentUser && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={handleReplyClick}
            >
              <Reply className="h-3 w-3" />
              Responder
            </Button>
          )}
          {isOwnComment && !isEditing && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="h-3 w-3" />
              Editar
            </Button>
          )}
          {canDelete(comment) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
              onClick={() => onDeleteComment(comment.id)}
            >
              <Trash2 className="h-3 w-3" />
              Excluir
            </Button>
          )}
        </div>

        {/* Reply Form */}
        {isThisCommentBeingRepliedTo && (
          <div className="mt-3 ml-2 flex gap-2">
            <Textarea
              placeholder={`Respondendo a ${comment.profile?.username || "Usuário"}...`}
              value={currentReplyContent}
              onChange={(e) => setCurrentReplyContent(e.target.value)}
              className="min-h-[60px] text-sm"
            />
            <div className="flex flex-col gap-1">
              <Button
                size="sm"
                onClick={handleReplySubmit}
                disabled={!currentReplyContent.trim() || isAddingComment}
              >
                Enviar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancelReply}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Replies */}
        {comment.replies?.map((reply) => (
          <CommentItem
            key={reply.id}
            comment={reply}
            isReply
            currentUser={currentUser}
            isCurrentUserFundador={isCurrentUserFundador}
            onDeleteComment={onDeleteComment}
            onAddReply={onAddReply}
            isAddingComment={isAddingComment}
            onEditComment={onEditComment}
            isUpdatingComment={isUpdatingComment}
            navigate={navigate}
            toast={toast}
            replyingToId={replyingToId}
            setReplyingToId={setReplyingToId}
            currentReplyContent={currentReplyContent}
            setCurrentReplyContent={setCurrentReplyContent}
          />
        ))}
      </div>
    </div>
  );
});