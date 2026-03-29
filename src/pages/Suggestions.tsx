import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/PaginationControls";
import { ImageLightbox } from "@/components/ImageLightbox";
import { Plus, X, User, MessageSquare, Lightbulb, Send, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";

export default function Suggestions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [newMediaUrl, setNewMediaUrl] = useState("");

  // Lightbox
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Comments toggle
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ["suggestions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suggestions" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const items = data as any[];
      if (!items || items.length === 0) return [];

      const userIds = [...new Set(items.map((s: any) => s.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
      return items.map((s: any) => ({ ...s, author: profileMap.get(s.user_id) || null }));
    },
  });

  const { currentPage, totalPages, paginatedItems, goToPage } = usePagination(suggestions);

  // Fetch comments for expanded suggestions
  const { data: allComments } = useQuery({
    queryKey: ["suggestion-comments", Array.from(expandedComments)],
    queryFn: async () => {
      if (expandedComments.size === 0) return {};
      const ids = Array.from(expandedComments);
      const { data, error } = await supabase
        .from("suggestion_comments" as any)
        .select("*")
        .in("suggestion_id", ids)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const comments = data as any[];
      const commentUserIds = [...new Set(comments.map((c: any) => c.user_id))];
      let profileMap = new Map();
      if (commentUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, avatar_url")
          .in("user_id", commentUserIds);
        profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
      }

      const grouped: Record<string, any[]> = {};
      for (const c of comments) {
        if (!grouped[c.suggestion_id]) grouped[c.suggestion_id] = [];
        grouped[c.suggestion_id].push({ ...c, author: profileMap.get(c.user_id) || null });
      }
      return grouped;
    },
    enabled: expandedComments.size > 0,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Login necessário");
      const { error } = await supabase.from("suggestions" as any).insert({
        user_id: user.id,
        subject,
        title,
        description,
        image_url: imageUrl || null,
        media_urls: mediaUrls,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      setShowForm(false);
      setSubject("");
      setTitle("");
      setDescription("");
      setImageUrl("");
      setMediaUrls([]);
      toast({ title: "Sugestão publicada com sucesso!" });
    },
    onError: (e: any) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("suggestions" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      toast({ title: "Sugestão excluída!" });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async ({ suggestionId, content }: { suggestionId: string; content: string }) => {
      if (!user) throw new Error("Login necessário");
      const { error } = await supabase.from("suggestion_comments" as any).insert({
        suggestion_id: suggestionId,
        user_id: user.id,
        content,
      } as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["suggestion-comments"] });
      setCommentTexts((prev) => ({ ...prev, [vars.suggestionId]: "" }));
    },
    onError: (e: any) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("suggestion_comments" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestion-comments"] });
    },
  });

  const toggleComments = (id: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openLightbox = (images: string[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const addMediaUrl = () => {
    if (newMediaUrl && !mediaUrls.includes(newMediaUrl)) {
      setMediaUrls([...mediaUrls, newMediaUrl]);
      setNewMediaUrl("");
    }
  };

  return (
    <Layout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Lightbulb className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">Sugestões</h1>
            </div>
            <p className="text-muted-foreground">
              Compartilhe suas ideias e sugestões com a comunidade.
            </p>
          </div>
          {user && (
            <Button onClick={() => setShowForm(!showForm)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Sugestão
            </Button>
          )}
        </div>

        {/* Form */}
        {showForm && user && (
          <Card className="mb-8 border-primary/30">
            <CardHeader>
              <CardTitle>Criar Sugestão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Assunto *</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex: Melhoria, Bug, Novo recurso..." />
              </div>
              <div>
                <Label>Título *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título da sugestão" />
              </div>
              <div>
                <Label>Descrição *</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva sua sugestão em detalhes..." rows={5} />
              </div>
              <div>
                <Label>URL da Imagem Principal</Label>
                <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://exemplo.com/imagem.jpg" />
                {imageUrl && (
                  <div className="mt-2 w-48 aspect-video rounded-lg overflow-hidden">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <div>
                <Label>Imagens Adicionais</Label>
                <div className="flex gap-2">
                  <Input value={newMediaUrl} onChange={(e) => setNewMediaUrl(e.target.value)} placeholder="URL da imagem" />
                  <Button type="button" variant="outline" onClick={addMediaUrl}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {mediaUrls.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {mediaUrls.map((url, i) => (
                      <div key={i} className="relative aspect-video rounded-lg overflow-hidden group">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => setMediaUrls(mediaUrls.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => createMutation.mutate()} disabled={!subject || !title || !description || createMutation.isPending}>
                  {createMutation.isPending ? "Publicando..." : "Publicar"}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
          </div>
        ) : suggestions && suggestions.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground mb-4">{suggestions.length} sugestão(ões) no total</p>
            <div className="space-y-6">
              {paginatedItems.map((suggestion: any) => {
                const allImages = [suggestion.image_url, ...(suggestion.media_urls || [])].filter(Boolean);
                const comments = allComments?.[suggestion.id] || [];
                const isExpanded = expandedComments.has(suggestion.id);

                return (
                  <Card key={suggestion.id} className="border-border">
                    <CardContent className="pt-6">
                      <div className="flex gap-4">
                        {/* Main image */}
                        {suggestion.image_url && (
                          <div
                            className="w-48 h-32 flex-shrink-0 rounded-lg overflow-hidden cursor-pointer"
                            onClick={() => openLightbox(allImages, 0)}
                          >
                            <img src={suggestion.image_url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">{suggestion.subject}</span>
                              <h3 className="text-xl font-bold mt-2">{suggestion.title}</h3>
                            </div>
                            {(user?.id === suggestion.user_id) && (
                              <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(suggestion.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                          <p className="text-muted-foreground mt-2 whitespace-pre-wrap line-clamp-3">{suggestion.description}</p>

                          {/* Gallery thumbnails */}
                          {allImages.length > 1 && (
                            <div className="flex gap-2 mt-3">
                              {allImages.slice(1, 4).map((url: string, i: number) => (
                                <div key={i} className="w-16 h-16 rounded cursor-pointer overflow-hidden" onClick={() => openLightbox(allImages, i + 1)}>
                                  <img src={url} alt="" className="w-full h-full object-cover hover:scale-110 transition-transform" />
                                </div>
                              ))}
                              {allImages.length > 4 && (
                                <div className="w-16 h-16 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground cursor-pointer" onClick={() => openLightbox(allImages, 4)}>
                                  +{allImages.length - 4}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Author & meta */}
                          <div className="flex items-center gap-3 mt-4 text-sm text-muted-foreground">
                            <Link to={`/profile/${suggestion.user_id}`} className="flex items-center gap-2 hover:text-foreground transition-colors">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={suggestion.author?.avatar_url || undefined} />
                                <AvatarFallback><User className="h-3 w-3" /></AvatarFallback>
                              </Avatar>
                              <span>{suggestion.author?.username || "Usuário"}</span>
                            </Link>
                            <span>•</span>
                            <span>{format(new Date(suggestion.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                          </div>
                        </div>
                      </div>

                      {/* Comments toggle */}
                      <div className="mt-4 pt-4 border-t border-border">
                        <button
                          onClick={() => toggleComments(suggestion.id)}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Comentários
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>

                        {isExpanded && (
                          <div className="mt-4 space-y-3">
                            {comments.map((c: any) => (
                              <div key={c.id} className="flex gap-3 items-start">
                                <Link to={`/profile/${c.user_id}`}>
                                  <Avatar className="h-7 w-7">
                                    <AvatarImage src={c.author?.avatar_url || undefined} />
                                    <AvatarFallback><User className="h-3 w-3" /></AvatarFallback>
                                  </Avatar>
                                </Link>
                                <div className="flex-1 bg-muted/50 rounded-lg p-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{c.author?.username || "Usuário"}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground">{format(new Date(c.created_at), "dd/MM HH:mm")}</span>
                                      {user?.id === c.user_id && (
                                        <button onClick={() => deleteCommentMutation.mutate(c.id)} className="text-destructive hover:text-destructive/80">
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">{c.content}</p>
                                </div>
                              </div>
                            ))}

                            {user && (
                              <div className="flex gap-2 mt-2">
                                <Input
                                  value={commentTexts[suggestion.id] || ""}
                                  onChange={(e) => setCommentTexts((prev) => ({ ...prev, [suggestion.id]: e.target.value }))}
                                  placeholder="Escreva um comentário..."
                                  className="flex-1"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && commentTexts[suggestion.id]?.trim()) {
                                      commentMutation.mutate({ suggestionId: suggestion.id, content: commentTexts[suggestion.id].trim() });
                                    }
                                  }}
                                />
                                <Button
                                  size="icon"
                                  disabled={!commentTexts[suggestion.id]?.trim() || commentMutation.isPending}
                                  onClick={() => {
                                    if (commentTexts[suggestion.id]?.trim()) {
                                      commentMutation.mutate({ suggestionId: suggestion.id, content: commentTexts[suggestion.id].trim() });
                                    }
                                  }}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
          </>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma sugestão ainda. Seja o primeiro a sugerir!</p>
          </div>
        )}
      </div>

      <ImageLightbox images={lightboxImages} initialIndex={lightboxIndex} open={lightboxOpen} onClose={() => setLightboxOpen(false)} />
    </Layout>
  );
}
