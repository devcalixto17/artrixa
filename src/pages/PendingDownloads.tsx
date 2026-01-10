import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Check, X, User, Calendar, ArrowLeft, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link, Navigate } from "react-router-dom";

export default function PendingDownloads() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingDownloads, isLoading } = useQuery({
    queryKey: ["pending-downloads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("downloads")
        .select(`
          *,
          categories(name, slug)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch author profiles separately
      const authorIds = [...new Set(data?.map(d => d.author_id).filter(Boolean))];
      
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

      return data?.map(download => ({
        ...download,
        author: download.author_id ? profiles[download.author_id] : null
      }));
    },
    enabled: isAdmin,
  });

  // Approve mutation - updates status to 'approved'
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("downloads")
        .update({ status: "approved" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-downloads"] });
      queryClient.invalidateQueries({ queryKey: ["downloads"] });
      queryClient.invalidateQueries({ queryKey: ["recent-downloads"] });
      toast({
        title: "Aprovado!",
        description: "A publicação foi aprovada e está visível no site.",
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

  // Reject mutation - deletes the publication
  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("downloads")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-downloads"] });
      queryClient.invalidateQueries({ queryKey: ["pending-downloads-count"] });
      queryClient.invalidateQueries({ queryKey: ["downloads"] });
      queryClient.invalidateQueries({ queryKey: ["downloads-by-category"] });
      queryClient.invalidateQueries({ queryKey: ["skins-downloads"] });
      queryClient.invalidateQueries({ queryKey: ["recent-downloads"] });
      toast({
        title: "Rejeitado",
        description: "A publicação foi removida do site e do banco de dados.",
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

  if (authLoading) {
    return (
      <Layout>
        <div className="container py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <Layout>
      <div className="container py-8">
        <Link to="/admin" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          Voltar para Painel Admin
        </Link>

        <h1 className="text-3xl font-bold mb-6">Publicações Pendentes</h1>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : pendingDownloads?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nenhuma publicação pendente</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingDownloads?.map((download) => (
              <Card key={download.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Image */}
                    {download.image_url && (
                      <div className="w-full md:w-48 aspect-video rounded-lg overflow-hidden shrink-0">
                        <img
                          src={download.image_url}
                          alt={download.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Content */}
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
                        {download.description || "Sem descrição"}
                      </p>

                      {/* Author and Date */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {download.author && (
                          <Link 
                            to={`/profile/${download.author.user_id}`}
                            className="flex items-center gap-2 hover:text-foreground"
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={download.author.avatar_url || undefined} />
                              <AvatarFallback>
                                <User className="h-3 w-3" />
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
        )}
      </div>

    </Layout>
  );
}
