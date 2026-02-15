import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Download,
  Calendar,
  User,
  ArrowLeft,
  Play,
  Trash2,
  Upload,
  Edit
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { CommentSection } from "@/components/comments/CommentSection";
import { UserHoverCard } from "@/components/profile/UserHoverCard";
import { Link as RouterLink } from "react-router-dom";
import { CommandBox } from "@/components/downloads/CommandBox";

export default function DownloadDetail() {
  // Helper to convert YouTube URLs to embed format
  const getYouTubeEmbedUrl = (url: string): string => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId = match && match[2].length === 11 ? match[2] : null;
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  };
  const { id } = useParams<{ id: string }>();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: downloadData, isLoading } = useQuery({
    queryKey: ["download", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("downloads")
        .select(`
          *,
          categories(name, slug, icon),
          custom_submenus:submenu_id(name),
          custom_pages:custom_page_id(title)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Fetch author profile separately
      let author = null;
      if (data.author_id) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("user_id, username, avatar_url, banner_url, created_at")
          .eq("user_id", data.author_id)
          .maybeSingle();
        author = profileData;
      }

      return { ...data, author };
    },
    enabled: !!id,
  });

  const { data: authorDownloadCount } = useQuery({
    queryKey: ["author-downloads", downloadData?.author_id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("downloads")
        .select("*", { count: "exact", head: true })
        .eq("author_id", downloadData?.author_id)
        .eq("status", "approved");

      if (error) throw error;
      return count || 0;
    },
    enabled: !!downloadData?.author_id,
  });

  // Check if current user is fundador
  const { data: isFundador } = useQuery({
    queryKey: ["user-is-fundador", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "fundador")
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!user,
  });

  // Check if user can edit (own post or fundador)
  const canEdit = downloadData && (downloadData.author_id === user?.id || isFundador);

  const deleteDownloadMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("ID não encontrado");

      const { error } = await supabase
        .from("downloads")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Post excluído com sucesso.",
      });
      navigate("/downloads");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o post.",
        variant: "destructive",
      });
    },
  });

  // Check if user already downloaded this file
  const { data: hasDownloaded } = useQuery({
    queryKey: ["download-tracking", id, user?.id],
    queryFn: async () => {
      if (!user) return false;

      const { data, error } = await supabase
        .from("download_tracking")
        .select("id")
        .eq("download_id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!id && !!user,
  });

  const trackDownloadMutation = useMutation({
    mutationFn: async () => {
      if (!user || !id) throw new Error("Usuário não autenticado");

      // Insert tracking record (will be ignored if already exists due to unique constraint)
      const { error: trackError } = await supabase
        .from("download_tracking")
        .insert({
          user_id: user.id,
          download_id: id,
        });

      // If it's a new download (not duplicate), increment the count
      if (!trackError) {
        const { error: updateError } = await supabase
          .from("downloads")
          .update({ download_count: (downloadData?.download_count || 0) + 1 })
          .eq("id", id);

        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["download", id] });
      queryClient.invalidateQueries({ queryKey: ["download-tracking", id, user?.id] });
    },
  });

  const handleDownload = async () => {
    // Check if user is logged in
    if (!user) {
      toast({
        title: "Login Necessário",
        description: "Você precisa estar logado para baixar arquivos.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (downloadData?.download_url) {
      // Track the download (only counts once per user)
      if (!hasDownloaded) {
        trackDownloadMutation.mutate();
      }

      // Trigger download
      const link = document.createElement("a");
      link.href = downloadData.download_url;
      link.download = downloadData.title || "download";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download iniciado!",
        description: "Seu arquivo está sendo baixado.",
      });
    } else {
      toast({
        title: "Erro",
        description: "Link de download não disponível",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full rounded-lg mb-6" />
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </Layout>
    );
  }

  if (!downloadData) {
    return (
      <Layout>
        <div className="container py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Download não encontrado</h1>
          <Link to="/downloads">
            <Button>Voltar para Downloads</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const mediaUrls = (downloadData.media_urls as string[]) || [];

  return (
    <Layout>
      <div className="container py-8">
        {/* Back Button */}
        <Link to="/downloads" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          Voltar para Downloads
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title and Category */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                {(downloadData.categories || (downloadData as any).custom_submenus || (downloadData as any).custom_pages) && (
                  <Badge variant="secondary">
                    {downloadData.categories?.name ||
                      (downloadData as any).custom_submenus?.name ||
                      (downloadData as any).custom_pages?.title}
                  </Badge>
                )}
                {downloadData.status === "pending" && (
                  <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                    Pendente
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold">{downloadData.title}</h1>
            </div>

            {/* Main Image */}
            {downloadData.image_url && (
              <div
                className="relative w-full rounded-lg overflow-hidden cursor-pointer"
                onClick={() => setSelectedImage(downloadData.image_url)}
              >
                <img
                  src={downloadData.image_url}
                  alt={downloadData.title}
                  className="w-full h-auto object-cover hover:scale-105 transition-transform rounded-lg"
                />
              </div>
            )}

            {/* Description - Render HTML from rich text editor */}
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-semibold mb-4">Descrição</h2>
                {downloadData.description ? (
                  <div
                    className="prose prose-sm max-w-none text-muted-foreground [&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-400"
                    dangerouslySetInnerHTML={{ __html: downloadData.description }}
                  />
                ) : (
                  <p className="text-muted-foreground">Sem descrição disponível.</p>
                )}
              </CardContent>
            </Card>

            {/* Commands Section */}
            {downloadData.commands && (
              <CommandBox commands={downloadData.commands} />
            )}

            {/* Video */}
            {downloadData.video_url && (
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Play className="h-5 w-5" />
                    Vídeo
                  </h2>
                  <div className="aspect-video rounded-lg overflow-hidden bg-black">
                    {downloadData.video_url.includes("youtube.com") || downloadData.video_url.includes("youtu.be") ? (
                      <iframe
                        src={getYouTubeEmbedUrl(downloadData.video_url)}
                        className="w-full h-full"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      />
                    ) : (
                      <video
                        src={downloadData.video_url}
                        controls
                        className="w-full h-full"
                      >
                        Seu navegador não suporta vídeos.
                      </video>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Gallery */}
            {mediaUrls.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-xl font-semibold mb-4">Galeria</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {mediaUrls.map((url, index) => (
                      <div
                        key={index}
                        className="aspect-video rounded-lg overflow-hidden cursor-pointer"
                        onClick={() => setSelectedImage(url)}
                      >
                        <img
                          src={url}
                          alt={`${downloadData.title} - Imagem ${index + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Download Card */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={handleDownload}
                >
                  <Download className="h-5 w-5" />
                  Baixar
                </Button>

                {/* Edit button for author or Fundador */}
                {canEdit && (
                  <RouterLink to={`/downloads/edit/${id}`}>
                    <Button
                      className="w-full gap-2"
                      size="lg"
                      variant="outline"
                    >
                      <Edit className="h-5 w-5" />
                      Editar Post
                    </Button>
                  </RouterLink>
                )}

                {/* Delete button for Fundador */}
                {isFundador && (
                  <Button
                    className="w-full gap-2"
                    size="lg"
                    variant="destructive"
                    onClick={() => deleteDownloadMutation.mutate()}
                    disabled={deleteDownloadMutation.isPending}
                  >
                    <Trash2 className="h-5 w-5" />
                    {deleteDownloadMutation.isPending ? "Excluindo..." : "Excluir Post"}
                  </Button>
                )}

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Download className="h-4 w-4" />
                    {downloadData.download_count || 0} downloads
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(downloadData.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Author Card */}
            {downloadData.author && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">Publicado por</h3>
                  <UserHoverCard userId={downloadData.author.user_id}>
                    <Link to={`/profile/${downloadData.author.user_id}`}>
                      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={downloadData.author.avatar_url || undefined} />
                          <AvatarFallback>
                            <User className="h-6 w-6" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{downloadData.author.username || "Usuário"}</p>
                          <p className="text-sm text-muted-foreground">
                            {authorDownloadCount} publicações
                          </p>
                        </div>
                      </div>
                    </Link>
                  </UserHoverCard>
                  <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Membro desde {format(new Date(downloadData.author.created_at), "MMMM yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Comments Section */}
        <div className="mt-8">
          <CommentSection downloadId={id!} />
        </div>

        {/* Image Modal */}
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl p-0">
            {selectedImage && (
              <img
                src={selectedImage}
                alt="Preview"
                className="w-full h-auto rounded-lg"
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}