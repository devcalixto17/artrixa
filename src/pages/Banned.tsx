import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useModeration } from "@/hooks/useModeration";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ban, Clock, User } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Banned() {
  const { user, signOut } = useAuth();
  const { activeModeration, isBanned, isLoading } = useModeration();
  const navigate = useNavigate();

  // Fetch moderator info
  const { data: moderatorProfile } = useQuery({
    queryKey: ["moderator-profile", activeModeration?.applied_by],
    queryFn: async () => {
      if (!activeModeration?.applied_by) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("user_id", activeModeration.applied_by)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!activeModeration?.applied_by,
  });

  useEffect(() => {
    if (!isLoading && !isBanned) {
      navigate("/");
    }
  }, [isLoading, isBanned, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!isBanned || !activeModeration) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full border-destructive/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 rounded-full bg-destructive/10">
            <Ban className="w-12 h-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl text-destructive">Conta Suspensa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center text-muted-foreground">
            <p>Sua conta foi banida e você não pode acessar o site.</p>
          </div>

          <div className="space-y-4 bg-muted/50 rounded-lg p-4">
            {/* Reason */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Motivo:</p>
              <p className="text-foreground">{activeModeration.reason}</p>
            </div>

            {/* Duration */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Duração:
              </p>
              <p className="text-foreground">
                {activeModeration.is_permanent ? (
                  <span className="text-destructive font-semibold">Permanente</span>
                ) : activeModeration.expires_at ? (
                  <>
                    Expira {formatDistanceToNow(new Date(activeModeration.expires_at), { 
                      locale: ptBR, 
                      addSuffix: true 
                    })}
                    <span className="text-muted-foreground text-sm ml-2">
                      ({format(new Date(activeModeration.expires_at), "dd/MM/yyyy HH:mm")})
                    </span>
                  </>
                ) : (
                  "Indefinido"
                )}
              </p>
            </div>

            {/* Applied by */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                <User className="w-4 h-4" />
                Aplicado por:
              </p>
              <p className="text-foreground">{moderatorProfile?.username || "Moderador"}</p>
            </div>

            {/* Applied at */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Data:</p>
              <p className="text-foreground">
                {format(new Date(activeModeration.applied_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            Se você acredita que isso foi um erro, entre em contato com a administração.
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={signOut}
          >
            Sair da conta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
