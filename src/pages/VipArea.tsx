import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Crown, Diamond, Check, CreditCard, Lock, Plus, Trash2, Download, X, Edit } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function VipArea() {
  const { user, isFundador } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  
  const [isProcessing, setIsProcessing] = useState(false);

  // New post form state
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostImage, setNewPostImage] = useState("");
  const [newPostDownloadUrl, setNewPostDownloadUrl] = useState("");
  const [newPostMediaUrls, setNewPostMediaUrls] = useState<string[]>([]);
  const [newMediaUrl, setNewMediaUrl] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Edit state
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editImage, setEditImage] = useState("");
  const [editDownloadUrl, setEditDownloadUrl] = useState("");

  // Check payment status from URL
  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "success") {
      toast({
        title: "Pagamento aprovado!",
        description: "Sua assinatura VIP foi ativada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["vip-subscription"] });
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
    } else if (status === "failure") {
      toast({
        title: "Pagamento não aprovado",
        description: "Houve um problema com seu pagamento. Tente novamente.",
        variant: "destructive",
      });
    } else if (status === "pending") {
      toast({
        title: "Pagamento pendente",
        description: "Aguardando confirmação do pagamento.",
      });
    }
  }, [searchParams, toast, queryClient]);

  // Check if user is VIP
  const { data: subscription, isLoading: loadingSubscription } = useQuery({
    queryKey: ["vip-subscription", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("vip_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Check if user has VIP role
  const { data: hasVipRole } = useQuery({
    queryKey: ["vip-role", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "vip_diamante")
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
    enabled: !!user,
  });

  const isVip = subscription?.status === "active" || hasVipRole || isFundador;

  // Fetch VIP posts
  const { data: vipPosts, isLoading: loadingPosts } = useQuery({
    queryKey: ["vip-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vip_posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isVip,
  });

  // Create Stripe checkout
  const createCheckoutMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      const { data, error } = await supabase.functions.invoke("create-checkout");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
      }
      setIsProcessing(false);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    },
  });

  // Create VIP post
  const createPostMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase.from("vip_posts").insert({
        author_id: user.id,
        title: newPostTitle,
        content: newPostContent,
        image_url: newPostImage || null,
        download_url: newPostDownloadUrl || null,
        media_urls: newPostMediaUrls,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vip-posts"] });
      setNewPostTitle("");
      setNewPostContent("");
      setNewPostImage("");
      setNewPostDownloadUrl("");
      setNewPostMediaUrls([]);
      setShowCreateForm(false);
      toast({ title: "Post VIP criado com sucesso!" });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update VIP post
  const updatePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from("vip_posts")
        .update({
          title: editTitle,
          content: editContent,
          image_url: editImage || null,
          download_url: editDownloadUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vip-posts"] });
      setEditingPost(null);
      toast({ title: "Post atualizado!" });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete VIP post
  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from("vip_posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vip-posts"] });
      toast({ title: "Post excluído!" });
    },
  });

  const addMediaUrl = () => {
    if (newMediaUrl && !newPostMediaUrls.includes(newMediaUrl)) {
      setNewPostMediaUrls([...newPostMediaUrls, newMediaUrl]);
      setNewMediaUrl("");
    }
  };

  const removeMediaUrl = (index: number) => {
    setNewPostMediaUrls(newPostMediaUrls.filter((_, i) => i !== index));
  };

  const startEditing = (post: any) => {
    setEditingPost(post.id);
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditImage(post.image_url || "");
    setEditDownloadUrl(post.download_url || "");
  };

  if (!user) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <Lock className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Área Exclusiva</h1>
          <p className="text-muted-foreground mb-4">
            Faça login para acessar a área de membros VIP
          </p>
          <Button onClick={() => navigate("/auth")}>Fazer Login</Button>
        </div>
      </Layout>
    );
  }

  // VIP Content Area
  if (isVip) {
    return (
      <Layout>
        <div className="container py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Diamond className="h-8 w-8 text-cyan-400" />
                <h1 className="text-3xl font-bold text-foreground">Área VIP Diamante</h1>
              </div>
              <p className="text-muted-foreground">
                Conteúdo exclusivo para membros VIP
              </p>
            </div>
            
            {isFundador && (
              <Button onClick={() => setShowCreateForm(!showCreateForm)} className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Post VIP
              </Button>
            )}
          </div>

          {/* Create Post Form (Fundador only) */}
          {isFundador && showCreateForm && (
            <Card className="mb-8 border-cyan-500/30">
              <CardHeader>
                <CardTitle>Criar Post VIP</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                    placeholder="Título do post exclusivo"
                  />
                </div>
                <div>
                  <Label htmlFor="content">Descrição *</Label>
                  <Textarea
                    id="content"
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="Descrição do conteúdo exclusivo..."
                    rows={5}
                  />
                </div>
                <div>
                  <Label htmlFor="image">URL da Imagem Principal</Label>
                  <Input
                    id="image"
                    value={newPostImage}
                    onChange={(e) => setNewPostImage(e.target.value)}
                    placeholder="https://exemplo.com/imagem.jpg"
                  />
                  {newPostImage && (
                    <div className="mt-2 aspect-video w-48 rounded-lg overflow-hidden">
                      <img src={newPostImage} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="download">URL de Download</Label>
                  <Input
                    id="download"
                    value={newPostDownloadUrl}
                    onChange={(e) => setNewPostDownloadUrl(e.target.value)}
                    placeholder="https://exemplo.com/arquivo.zip"
                  />
                </div>
                <div>
                  <Label>Galeria de Imagens</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newMediaUrl}
                      onChange={(e) => setNewMediaUrl(e.target.value)}
                      placeholder="URL da imagem adicional"
                    />
                    <Button type="button" variant="outline" onClick={addMediaUrl}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {newPostMediaUrls.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {newPostMediaUrls.map((url, index) => (
                        <div key={index} className="relative aspect-video rounded-lg overflow-hidden group">
                          <img src={url} alt={`Gallery ${index + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeMediaUrl(index)}
                            className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => createPostMutation.mutate()}
                    disabled={!newPostTitle || !newPostContent || createPostMutation.isPending}
                  >
                    {createPostMutation.isPending ? "Criando..." : "Criar Post"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* VIP Posts */}
          {loadingPosts ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 rounded-lg" />
              ))}
            </div>
          ) : vipPosts && vipPosts.length > 0 ? (
            <div className="grid gap-6">
              {vipPosts.map((post) => (
                <Card key={post.id} className="border-cyan-500/20 bg-gradient-to-br from-background to-cyan-950/10">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        {editingPost === post.id ? (
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="mb-2"
                          />
                        ) : (
                          <CardTitle className="flex items-center gap-2">
                            <Diamond className="h-5 w-5 text-cyan-400" />
                            {post.title}
                          </CardTitle>
                        )}
                        <CardDescription>
                          {format(new Date(post.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </CardDescription>
                      </div>
                      {isFundador && (
                        <div className="flex gap-2">
                          {editingPost === post.id ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => updatePostMutation.mutate(post.id)}
                                disabled={updatePostMutation.isPending}
                              >
                                Salvar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingPost(null)}
                              >
                                Cancelar
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => startEditing(post)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deletePostMutation.mutate(post.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {editingPost === post.id ? (
                      <div className="space-y-4">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={4}
                        />
                        <Input
                          value={editImage}
                          onChange={(e) => setEditImage(e.target.value)}
                          placeholder="URL da imagem"
                        />
                        <Input
                          value={editDownloadUrl}
                          onChange={(e) => setEditDownloadUrl(e.target.value)}
                          placeholder="URL de download"
                        />
                      </div>
                    ) : (
                      <>
                        {post.image_url && (
                          <img
                            src={post.image_url}
                            alt={post.title}
                            className="w-full max-h-96 object-cover rounded-lg mb-4"
                          />
                        )}
                        <div className="prose prose-invert max-w-none">
                          <p className="whitespace-pre-wrap">{post.content}</p>
                        </div>
                        
                        {/* Gallery */}
                        {(post as any).media_urls && (post as any).media_urls.length > 0 && (
                          <div className="grid grid-cols-3 gap-2 mt-4">
                            {((post as any).media_urls as string[]).map((url, index) => (
                              <img
                                key={index}
                                src={url}
                                alt={`${post.title} - ${index + 1}`}
                                className="w-full aspect-video object-cover rounded-lg"
                              />
                            ))}
                          </div>
                        )}
                        
                        {/* Download button */}
                        {(post as any).download_url && (
                          <div className="mt-4">
                            <a
                              href={(post as any).download_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                            >
                              <Button className="gap-2">
                                <Download className="h-4 w-4" />
                                Baixar Arquivo VIP
                              </Button>
                            </a>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <Diamond className="h-16 w-16 mx-auto text-cyan-400/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum post exclusivo ainda</h3>
                <p className="text-muted-foreground">
                  Fique ligado! Em breve teremos conteúdo exclusivo para você.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </Layout>
    );
  }

  // Payment Page for non-VIP users
  return (
    <Layout>
      <div className="container py-8 max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 mb-4">
            <Crown className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">VIP DIAMANTE</h1>
          <p className="text-xl text-muted-foreground">
            Acesso exclusivo ao melhor conteúdo do CS 1.6
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Benefits */}
          <Card className="border-cyan-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Diamond className="h-5 w-5 text-cyan-400" />
                Benefícios Exclusivos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                "Acesso à área VIP com posts exclusivos",
                "Downloads exclusivos de conteúdo premium",
                "Insígnia VIP Diamante no perfil",
                "Cargo especial VIP Diamante",
                "Conteúdo antecipado e exclusivo",
                "Suporte prioritário",
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <Check className="h-4 w-4 text-cyan-400" />
                  </div>
                  <span className="text-foreground">{benefit}</span>
                </div>
              ))}
              
              <div className="pt-4 border-t">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-cyan-400">R$ 19,90</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Pagamento Seguro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingSubscription ? (
                <Skeleton className="h-48" />
              ) : (
                <>
                  <p className="text-muted-foreground">
                    Você será redirecionado para o checkout seguro do Stripe para completar sua assinatura.
                  </p>

                  <Button
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                    size="lg"
                    onClick={() => createCheckoutMutation.mutate()}
                    disabled={isProcessing || createCheckoutMutation.isPending}
                  >
                    {isProcessing || createCheckoutMutation.isPending ? (
                      "Processando..."
                    ) : (
                      <>
                        <Diamond className="h-5 w-5 mr-2" />
                        Assinar VIP Diamante
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Pagamento seguro processado pelo Stripe
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}