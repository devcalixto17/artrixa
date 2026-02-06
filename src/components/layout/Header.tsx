"use client";

import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, User, LogOut, Shield, Menu, X, Plus, Bell, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Header = () => {
  const { user, isAdmin, isFundador, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const navLinks = [
    { name: "Início", path: "/" },
    { name: "Plugins", path: "/categoria/plugins" },
    { name: "Skins", path: "/skins" },
    { name: "Mods", path: "/categoria/mods" },
    { name: "Downloads", path: "/downloads" },
    { name: "Área VIP", path: "/vip" },
  ];

  const performSearch = async (query: string) => {
    if (!query.trim()) return;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setIsSearching(true);
    setIsSearchOpen(true);

    try {
      const fuzzyQuery = `%${query.trim().split('').join('%')}%`;
      const simpleQuery = `%${query.trim().replace(/\s+/g, '%')}%`;

      const { data: downloads, error: downloadError } = await supabase
        .from("downloads")
        .select(`
          *,
          categories(name, slug)
        `)
        .or(`title.ilike.${simpleQuery},description.ilike.${simpleQuery},title.ilike.${fuzzyQuery}`)
        .eq("status", "approved")
        .limit(10);

      if (downloadError) {
        console.error("Erro na busca:", downloadError.message);
        setSearchResults([]);
        return;
      }

      if (!downloads || downloads.length === 0) {
        setSearchResults([]);
        return;
      }

      const authorIds = [...new Set(downloads.map(d => d.author_id).filter(Boolean))];

      let profileMap = new Map();
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, avatar_url")
          .in("user_id", authorIds);

        profiles?.forEach(p => profileMap.set(p.user_id, p));
      }

      const results = downloads.map(d => ({
        ...d,
        author: d.author_id ? profileMap.get(d.author_id) : null
      }));

      setSearchResults(results);
    } catch (err) {
      console.error("Erro inesperado na busca:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const { data: pendingCount } = useQuery({
    queryKey: ["pending-downloads-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("downloads")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) return 0;
      return count || 0;
    },
    enabled: isAdmin || isFundador,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (searchQuery.trim()) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchQuery);
      }, 500);

      return () => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      };
    } else {
      setSearchResults([]);
      setIsSearchOpen(false);
    }
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display text-2xl font-black text-primary neon-glow tracking-wider">CS1.6 </span>
            <span className="font-display text-2xl font-black text-foreground tracking-wider">MODS </span>
          </Link>

          {/* Desktop Navigation */}


          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              if (link.name === "Skins") {
                return (
                  <DropdownMenu key={link.path}>
                    <DropdownMenuTrigger className="px-4 py-2 text-sm font-display font-bold text-muted-foreground hover:text-primary transition-colors tracking-wide uppercase outline-none flex items-center gap-1 group data-[state=open]:text-primary">
                      Skins
                      <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48 bg-background border-border">

                      <DropdownMenuItem onClick={() => navigate("/categoria/skins-armas")} className="cursor-pointer font-display font-bold text-muted-foreground hover:text-primary hover:bg-secondary/50 uppercase tracking-wide">
                        Skins de Armas
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/categoria/skins-facas")} className="cursor-pointer font-display font-bold text-muted-foreground hover:text-primary hover:bg-secondary/50 uppercase tracking-wide">
                        Skins de Facas
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/categoria/skins-player")} className="cursor-pointer font-display font-bold text-muted-foreground hover:text-primary hover:bg-secondary/50 uppercase tracking-wide">
                        Skins de Player
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/categoria/skins-zombies")} className="cursor-pointer font-display font-bold text-muted-foreground hover:text-primary hover:bg-secondary/50 uppercase tracking-wide">
                        Skins de Zombies
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }

              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className="px-4 py-2 text-sm font-display font-bold text-muted-foreground hover:text-primary transition-colors tracking-wide uppercase"
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-4">
            {/* Desktop Search */}
            <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center gap-2 bg-secondary rounded-lg px-3 py-1">
              <button type="submit" className="hover:text-primary transition-colors">
                <Search className="w-4 h-4 text-muted-foreground" />
              </button>
              <Input
                placeholder="Pesquisar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-0 bg-transparent h-auto p-1 text-sm focus-visible:ring-0 w-40"
              />
            </form>

            {user ? (
              <div className="hidden sm:flex items-center gap-2">
                <Button variant="neon" size="sm" onClick={() => navigate("/downloads/new")}>
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Publicar</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate(`/profile/${user.id}`)}>
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Perfil</span>
                </Button>
                {(isAdmin || isFundador) && (
                  <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="relative">
                    <Shield className="w-4 h-4" />
                    <span className="hidden sm:inline">{isFundador ? "Fundador" : "Admin"}</span>
                    {pendingCount && pendingCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center">
                        {pendingCount > 9 ? "9+" : pendingCount}
                      </span>
                    )}
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sair</span>
                </Button>
              </div>
            ) : (
              <Button variant="neon" size="sm" onClick={() => navigate("/auth")}>
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Entrar</span>
              </Button>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden py-2">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-1">
            <button type="submit" className="hover:text-primary transition-colors">
              <Search className="w-4 h-4 text-muted-foreground" />
            </button>
            <Input
              placeholder="Pesquisar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 bg-transparent h-auto p-1 text-sm focus-visible:ring-0 flex-1"
            />
          </form>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-background border-t border-border">
          <div className="px-4 py-2 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="block px-3 py-2 text-sm font-display font-bold text-muted-foreground hover:text-primary hover:bg-secondary/50 rounded transition-colors tracking-wide uppercase"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}

            {user ? (
              <div className="pt-2 border-t border-border mt-2 space-y-2">
                <Button
                  variant="neon"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    navigate("/downloads/new");
                    setMobileMenuOpen(false);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Publicar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    navigate(`/profile/${user.id}`);
                    setMobileMenuOpen(false);
                  }}
                >
                  <User className="w-4 h-4 mr-2" />
                  Perfil
                </Button>
                {(isAdmin || isFundador) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start relative"
                    onClick={() => {
                      navigate("/admin");
                      setMobileMenuOpen(false);
                    }}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    {isFundador ? "Fundador" : "Admin"}
                    {pendingCount && pendingCount > 0 && (
                      <span className="absolute -top-1 -right-2 bg-destructive text-destructive-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center">
                        {pendingCount > 9 ? "9+" : pendingCount}
                      </span>
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-destructive hover:text-destructive"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
              </div>
            ) : (
              <div className="pt-2 border-t border-border mt-2">
                <Button
                  variant="neon"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    navigate("/auth");
                    setMobileMenuOpen(false);
                  }}
                >
                  <User className="w-4 h-4 mr-2" />
                  Entrar
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resultados da busca para "{searchQuery}"</DialogTitle>
          </DialogHeader>

          {isSearching ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">Buscando...</p>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
              {searchResults.map((download) => (
                <Card
                  key={download.id}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => {
                    navigate(`/download/${download.id}`);
                    setIsSearchOpen(false);
                    setSearchQuery("");
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex gap-3">
                      <img
                        src={download.image_url || "/placeholder.svg"}
                        alt={download.title}
                        className="w-16 h-16 rounded-md object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate">{download.title}</h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {download.categories?.name || "Sem categoria"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={download.author?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">U</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground truncate">
                            {download.author?.username || "Anônimo"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : searchQuery.trim() ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">Nenhum resultado encontrado.</p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </header>
  );
};