import { Layout } from "@/components/layout/Layout";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Calendar, Download, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DownloadCard } from "@/components/cards/DownloadCard";
import { EditProfileDialog } from "@/components/profile/EditProfileDialog";
import { RoleBadge } from "@/components/profile/RoleBadge";
import { UserBadges } from "@/components/profile/UserBadges";
import { useAuth } from "@/hooks/useAuth";

const Profile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const isOwnProfile = user?.id === userId;

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: userRole } = useQuery({
    queryKey: ["user-role", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data?.role || "user";
    },
    enabled: !!userId,
  });

  const { data: userDownloads, isLoading: downloadsLoading } = useQuery({
    queryKey: ["user-downloads", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("downloads")
        .select("*, categories(name)")
        .eq("author_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const role = (userRole as "fundador" | "admin" | "staff" | "user") || "user";

  if (profileLoading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <Skeleton className="w-24 h-24 rounded-full" />
                <div className="space-y-2 text-center sm:text-left">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-6 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <User className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Usuário não encontrado
              </h2>
              <p className="text-muted-foreground">
                O perfil que você está procurando não existe.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card className="bg-card border-border overflow-hidden">
          {/* Banner */}
          <div className="h-40 relative overflow-hidden">
            {profile.banner_url ? (
              <img
                src={profile.banner_url}
                alt="Banner"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
            )}
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
          </div>

          <CardContent className="relative pt-0">
            <div className="flex flex-col sm:flex-row items-center gap-6 -mt-16">
              <Avatar className="w-28 h-28 border-4 border-card shadow-lg ring-2 ring-primary/20">
                <AvatarImage 
                  src={profile.avatar_url || undefined} 
                  className="object-cover"
                />
                <AvatarFallback className="bg-primary/20 text-primary text-3xl font-bold">
                  {profile.username?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>

              <div className="text-center sm:text-left space-y-3 flex-1">
                <h1 className="text-2xl font-display font-bold text-foreground">
                  {profile.username || "Usuário"}
                </h1>
                
                <RoleBadge role={role} />
                
                <UserBadges userId={userId!} />
              </div>

              {isOwnProfile && (
                <div className="sm:absolute sm:top-4 sm:right-4">
                  <EditProfileDialog profile={profile} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Membro Desde</p>
                <p className="font-semibold text-foreground">
                  {format(new Date(profile.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Download className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Uploads</p>
                <p className="font-semibold text-foreground">
                  {userDownloads?.length || 0} arquivos
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Clock className="w-5 h-5 text-primary" />
              Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {downloadsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-48 w-full" />
                ))}
              </div>
            ) : userDownloads && userDownloads.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {userDownloads.map((download) => (
                  <DownloadCard
                    key={download.id}
                    id={download.id}
                    title={download.title}
                    description={download.description}
                    imageUrl={download.image_url}
                    downloadCount={download.download_count || 0}
                    createdAt={download.created_at}
                    categoryName={download.categories?.name}
                    authorName={profile.username}
                    authorAvatar={profile.avatar_url}
                    authorUserId={profile.user_id}
                    compact
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Download className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">
                  Este usuário ainda não fez nenhum upload.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Profile;
