import { Layout } from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Award, Trophy, Star, Crown, Shield, Sparkles, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const iconMap: Record<string, React.ComponentType<any>> = {
  Award, Trophy, Star, Crown, Shield, Sparkles,
};

const Insignias = () => {
  const { data: badges, isLoading } = useQuery({
    queryKey: ["all-badges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("badges")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Cabeçalho */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            <Award className="w-8 h-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Insígnias
            </h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Conheça todas as insígnias disponíveis no site. Elas são conquistadas por
            ações, participação e reconhecimento dentro da comunidade.
          </p>
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : !badges || badges.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-16 text-center">
              <Award className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Nenhuma insígnia disponível
              </h2>
              <p className="text-muted-foreground">
                Ainda não há insígnias cadastradas no site.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {badges.map((badge) => {
              const isCustomIcon = badge.icon.startsWith("/");
              const BadgeIcon = !isCustomIcon ? iconMap[badge.icon] || Award : null;

              return (
                <Card
                  key={badge.id}
                  className="bg-card border-border overflow-hidden transition-all hover:-translate-y-1"
                  style={{ boxShadow: `0 0 0 1px ${badge.color}22` }}
                >
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor:
                            (badge as any).background_color || `${badge.color}20`,
                          boxShadow: `0 0 16px ${badge.color}40`,
                        }}
                      >
                        {isCustomIcon ? (
                          <img
                            src={badge.icon}
                            alt={badge.name}
                            className="w-9 h-9 object-contain"
                          />
                        ) : BadgeIcon ? (
                          <BadgeIcon className="w-8 h-8" style={{ color: badge.color }} />
                        ) : null}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3
                          className="font-bold text-lg leading-tight"
                          style={{ color: badge.color }}
                        >
                          {badge.name}
                        </h3>
                        {badge.is_automatic && (
                          <Badge variant="outline" className="mt-1 text-[10px]">
                            Automática
                          </Badge>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground min-h-[2.5rem]">
                      {badge.description || "Sem descrição."}
                    </p>

                    <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-border"
                          style={{ backgroundColor: badge.color }}
                        />
                        {badge.color}
                      </span>
                      {badge.created_at && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(badge.created_at), "dd MMM yyyy", {
                            locale: ptBR,
                          })}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Insignias;
