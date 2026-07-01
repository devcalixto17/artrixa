import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Edit, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface EditProfileDialogProps {
  profile: {
    user_id: string;
    username: string | null;
    avatar_url: string | null;
    banner_url: string | null;
  };
}

export const EditProfileDialog = ({ profile }: EditProfileDialogProps) => {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState(profile.username || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "avatar" | "banner"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Accept images and GIFs
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma imagem válida.",
        variant: "destructive",
      });
      return;
    }

    const preview = URL.createObjectURL(file);
    if (type === "avatar") {
      setAvatarFile(file);
      setAvatarPreview(preview);
    } else {
      setBannerFile(file);
      setBannerPreview(preview);
    }
  };

  const uploadFile = async (file: File, path: string) => {
    const { data, error } = await supabase.storage
      .from("profiles")
      .upload(path, file, { upsert: true });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from("profiles")
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      let avatarUrl = profile.avatar_url;
      let bannerUrl = profile.banner_url;

      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        avatarUrl = await uploadFile(
          avatarFile,
          `${profile.user_id}/avatar.${ext}`
        );
      }

      if (bannerFile) {
        const ext = bannerFile.name.split(".").pop();
        bannerUrl = await uploadFile(
          bannerFile,
          `${profile.user_id}/banner.${ext}`
        );
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          username: username.trim() || null,
          avatar_url: avatarUrl,
          banner_url: bannerUrl,
        })
        .eq("user_id", profile.user_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", profile.user_id] });
      toast({
        title: "Sucesso!",
        description: "Perfil atualizado com sucesso.",
      });
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil.",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Edit className="w-4 h-4" />
          Editar Perfil
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Editar Perfil</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Banner Preview */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Banner</Label>
            <div className="relative group">
              <div className="h-32 rounded-lg overflow-hidden bg-secondary">
                {(bannerPreview || profile.banner_url) && (
                  <img
                    src={bannerPreview || profile.banner_url || ""}
                    alt="Banner"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-lg">
                <Upload className="w-8 h-8 text-foreground" />
                <input
                  type="file"
                  accept="image/*,.gif"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, "banner")}
                />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Suporta imagens e GIFs animados
            </p>
          </div>

          {/* Avatar Preview */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Foto de Perfil</Label>
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Avatar className="w-20 h-20 border-2 border-border">
                  <AvatarImage src={avatarPreview || profile.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xl">
                    {username?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute inset-0 flex items-center justify-center bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                  <Upload className="w-6 h-6 text-foreground" />
                  <input
                    type="file"
                    accept="image/*,.gif"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e, "avatar")}
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Clique para alterar. Suporta GIFs animados.
              </p>
            </div>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username" className="text-muted-foreground">
              Nome de Usuário
            </Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Seu nome de usuário"
              className="bg-secondary border-border"
            />
          </div>

          {/* Save Button */}
          <Button
            onClick={() => updateProfileMutation.mutate()}
            disabled={updateProfileMutation.isPending}
            className="w-full"
          >
            {updateProfileMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Alterações"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
