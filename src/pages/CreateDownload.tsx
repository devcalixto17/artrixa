import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useModeration } from "@/hooks/useModeration";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, X, Plus, Loader2, Link as LinkIcon, FileUp, VolumeX } from "lucide-react";
import { Link } from "react-router-dom";
import { RichTextEditor } from "@/components/editor/RichTextEditor";

export default function CreateDownload() {
  const { user, isAdmin } = useAuth();
  const { isMuted } = useModeration();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [downloadType, setDownloadType] = useState<"link" | "file">("link");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloadFile, setDownloadFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [newMediaUrl, setNewMediaUrl] = useState("");

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const uploadFile = async (file: File): Promise<string> => {
    if (!user) throw new Error("Usuário não autenticado");

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("downloads")
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("downloads").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuário não autenticado");

      let finalDownloadUrl = downloadUrl;

      // Upload file if selected
      if (downloadType === "file" && downloadFile) {
        setIsUploadingFile(true);
        try {
          finalDownloadUrl = await uploadFile(downloadFile);
        } finally {
          setIsUploadingFile(false);
        }
      }

      const { error } = await supabase.from("downloads").insert({
        title,
        description,
        category_id: categoryId || null,
        image_url: imageUrl || null,
        download_url: finalDownloadUrl || null,
        video_url: videoUrl || null,
        media_urls: mediaUrls,
        author_id: user.id,
        status: isAdmin ? "approved" : "pending",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: isAdmin ? "Publicação criada!" : "Publicação enviada!",
        description: isAdmin 
          ? "Sua publicação foi criada com sucesso." 
          : "Sua publicação foi enviada para aprovação.",
      });
      navigate("/downloads");
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addMediaUrl = () => {
    if (newMediaUrl && !mediaUrls.includes(newMediaUrl)) {
      setMediaUrls([...mediaUrls, newMediaUrl]);
      setNewMediaUrl("");
    }
  };

  const removeMediaUrl = (index: number) => {
    setMediaUrls(mediaUrls.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDownloadFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações obrigatórias
    if (!title.trim()) {
      toast({
        title: "Erro",
        description: "O título é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: "Erro",
        description: "A descrição é obrigatória",
        variant: "destructive",
      });
      return;
    }

    if (!categoryId) {
      toast({
        title: "Erro",
        description: "Selecione uma categoria",
        variant: "destructive",
      });
      return;
    }

    if (!imageUrl.trim()) {
      toast({
        title: "Erro",
        description: "A imagem principal é obrigatória",
        variant: "destructive",
      });
      return;
    }

    if (downloadType === "link" && !downloadUrl.trim()) {
      toast({
        title: "Erro",
        description: "O link de download é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (downloadType === "file" && !downloadFile) {
      toast({
        title: "Erro",
        description: "Selecione um arquivo para upload",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate();
  };

  if (!user) {
    return (
      <Layout>
        <div className="container py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Acesso Restrito</h1>
          <p className="text-muted-foreground mb-4">
            Você precisa estar logado para criar uma publicação.
          </p>
          <Link to="/auth">
            <Button>Fazer Login</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  if (isMuted) {
    return (
      <Layout>
        <div className="container py-8 text-center">
          <VolumeX className="h-16 w-16 mx-auto text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-4">Você está silenciado</h1>
          <p className="text-muted-foreground mb-4">
            Você não pode criar publicações enquanto estiver silenciado.
          </p>
          <Link to="/downloads">
            <Button variant="outline">Voltar para Downloads</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8 max-w-3xl">
        <Link to="/downloads" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          Voltar para Downloads
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Criar Nova Publicação</CardTitle>
            {!isAdmin && (
              <p className="text-sm text-muted-foreground">
                Sua publicação será enviada para aprovação antes de ser publicada.
              </p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nome da sua publicação"
                  required
                />
              </div>

              {/* Description with Rich Text Editor */}
              <div className="space-y-2">
                <Label>Descrição *</Label>
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Descreva sua publicação em detalhes... (Você pode formatar o texto, mudar cores, fontes e tamanhos)"
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Main Image URL */}
              <div className="space-y-2">
                <Label htmlFor="imageUrl">URL da Imagem Principal *</Label>
                <Input
                  id="imageUrl"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://exemplo.com/imagem.jpg"
                  required
                />
                {imageUrl && (
                  <div className="mt-2 relative aspect-video w-full max-w-sm rounded-lg overflow-hidden">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Download Type Selection */}
              <div className="space-y-4">
                <Label>Arquivo para Download *</Label>
                <RadioGroup
                  value={downloadType}
                  onValueChange={(value) => setDownloadType(value as "link" | "file")}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="link" id="link" />
                    <Label htmlFor="link" className="flex items-center gap-2 cursor-pointer">
                      <LinkIcon className="h-4 w-4" />
                      Link Externo
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="file" id="file" />
                    <Label htmlFor="file" className="flex items-center gap-2 cursor-pointer">
                      <FileUp className="h-4 w-4" />
                      Upload de Arquivo
                    </Label>
                  </div>
                </RadioGroup>

                {downloadType === "link" ? (
                  <Input
                    value={downloadUrl}
                    onChange={(e) => setDownloadUrl(e.target.value)}
                    placeholder="https://exemplo.com/arquivo.zip"
                  />
                ) : (
                  <div className="space-y-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {downloadFile ? downloadFile.name : "Selecionar Arquivo"}
                    </Button>
                    {downloadFile && (
                      <p className="text-sm text-muted-foreground">
                        Arquivo selecionado: {downloadFile.name} ({(downloadFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Video URL */}
              <div className="space-y-2">
                <Label htmlFor="videoUrl">URL do Vídeo (YouTube) - Opcional</Label>
                <Input
                  id="videoUrl"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>

              {/* Gallery */}
              <div className="space-y-2">
                <Label>Galeria de Imagens (Opcional)</Label>
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
                {mediaUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {mediaUrls.map((url, index) => (
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

              {/* Submit */}
              <div className="flex gap-4">
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || isUploadingFile}
                  className="gap-2"
                >
                  {(createMutation.isPending || isUploadingFile) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {isUploadingFile ? "Enviando arquivo..." : isAdmin ? "Publicar" : "Enviar para Aprovação"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/downloads")}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}