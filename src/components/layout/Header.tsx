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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

export const Header = () => {
  const { user, isAdmin, isFundador, isStaff, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);


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
    enabled: isAdmin || isFundador || isStaff,
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

  const { data: navigationItems } = useQuery({
    queryKey: ["site-navigation"],
    queryFn: async () => {
      const { data: pages, error: pageError } = await supabase
        .from("custom_pages" as any)
        .select("*")
        .eq("is_pinned_header", true)
        .eq("status", "published")
        .order("display_order", { ascending: true });

      if (pageError) throw pageError;
      if (!pages) return [];

      const { data: submenus, error: subError } = await supabase
        .from("custom_submenus" as any)
        .select("*")
        .in("parent_page_id", (pages as any[]).map(p => p.id))
        .order("display_order", { ascending: true });

      if (subError) throw subError;

      // Organizador recursivo de submenus
      const organizeSubmenus = (parentId: string, parentSubId: string | null = null): any[] => {
        return (submenus as any[])
          ?.filter(s => s.parent_page_id === parentId && s.parent_submenu_id === parentSubId)
          .map(sub => ({
            ...sub,
            submenus: organizeSubmenus(parentId, sub.id)
          })) || [];
      };

      return (pages as any[]).map(page => ({
        ...page,
        submenus: organizeSubmenus(page.id)
      }));
    }
  });

  const handleSignOut = async () => {
    await signOut();
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display text-2xl font-black text-primary neon-glow tracking-wider">Butterfly </span>
            <span className="font-display text-2xl font-black text-foreground tracking-wider">GM </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navigationItems?.map((page: any) => {
              const hasSubmenus = page.submenus && page.submenus.length > 0;
              const path = page.system_path || `/${page.slug}`;

              if (hasSubmenus) {
                return (
                  <DropdownMenu key={page.id}>
                    <DropdownMenuTrigger className="px-2 py-2 text-xs font-display font-bold text-muted-foreground hover:text-primary transition-colors tracking-wide uppercase outline-none flex items-center gap-1 group data-[state=open]:text-primary">
                      {page.title}
                      <ChevronDown className="w-3 h-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48 bg-background border-border">
                      {page.submenus.map((sub: any) => {
                        const hasNested = sub.submenus && sub.submenus.length > 0;
                        const subPath = page.slug === 'skins'
                          ? `/categoria/${sub.slug}`
                          : `/${page.slug}/${sub.slug}`;

                        if (hasNested) {
                          return (
                            <DropdownMenuSub key={sub.id}>
                              <DropdownMenuSubTrigger className="cursor-pointer font-display font-bold text-muted-foreground hover:text-primary hover:bg-secondary/50 uppercase tracking-wide">
                                {sub.name}
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent className="bg-background border-border">
                                {sub.submenus.map((nested: any) => (
                                  <DropdownMenuItem
                                    key={nested.id}
                                    onClick={() => navigate(`/${page.slug}/${sub.slug}/${nested.slug}`)}
                                    className="cursor-pointer font-display font-bold text-muted-foreground hover:text-primary hover:bg-secondary/50 uppercase tracking-wide"
                                  >
                                    {nested.name}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          );
                        }

                        return (
                          <DropdownMenuItem
                            key={sub.id}
                            onClick={() => navigate(subPath)}
                            className="cursor-pointer font-display font-bold text-muted-foreground hover:text-primary hover:bg-secondary/50 uppercase tracking-wide"
                          >
                            {sub.name}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }

              return (
                <Link
                  key={page.id}
                  to={path}
                  className="px-2 py-2 text-xs font-display font-bold text-muted-foreground hover:text-primary transition-colors tracking-wide uppercase"
                >
                  {page.title}
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
                <Button variant="neon" size="sm" onClick={() => navigate("/downloads/new")} className="h-8 px-2 text-xs">
                  <Plus className="w-3 h-3 mr-1" />
                  <span className="hidden xl:inline">Publicar</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate(`/profile/${user.id}`)} className="h-8 px-2 text-xs">
                  <User className="w-3 h-3 mr-1" />
                  <span className="hidden xl:inline">Perfil</span>
                </Button>
                {(isAdmin || isFundador || isStaff) && (
                  <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="relative h-8 px-2 text-xs">
                    <Shield className="w-3 h-3 mr-1" />
                    <span className="hidden xl:inline">{isFundador ? "Fundador" : isAdmin ? "Admin" : "Painel"}</span>
                    {pendingCount && pendingCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full h-3 w-3 flex items-center justify-center">
                        {pendingCount > 9 ? "9+" : pendingCount}
                      </span>
                    )}
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="h-8 px-2">
                  <LogOut className="w-3 h-3" />
                  <span className="sr-only">Sair</span>
                </Button>
              </div>
            ) : (
              <Button variant="neon" size="sm" onClick={() => navigate("/auth")} className="h-8 px-3 text-xs">
                <User className="w-3 h-3 mr-1" />
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
          {navigationItems?.map((page: any) => {
            const hasSubmenus = page.submenus && page.submenus.length > 0;
            const path = page.system_path || `/${page.slug}`;

            const renderMobileItem = (item: any, depth = 0, currentAccumulatedPath = "") => {
              const hasSubs = item.submenus && item.submenus.length > 0;
              const isOpen = openSubmenus[item.id] || false;
              const toggleOpen = () => setOpenSubmenus(prev => ({ ...prev, [item.id]: !prev[item.id] }));

              const itemPath = item.system_path || (depth === 0 ? `/${item.slug}` : `${currentAccumulatedPath}/${item.slug}`);

              if (hasSubs) {
                return (
                  <div key={item.id} className="space-y-1">
                    <button
                      onClick={toggleOpen}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm font-display font-bold text-muted-foreground hover:text-primary hover:bg-secondary/50 rounded transition-colors tracking-wide uppercase ${depth > 0 ? 'pl-6' : ''}`}
                    >
                      {item.title || item.name}
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isOpen && (
                      <div className={`space-y-1 ${depth === 0 ? 'bg-secondary/10' : ''} rounded-md my-1`}>
                        {item.submenus.map((sub: any) => renderMobileItem(sub, depth + 1, itemPath))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.id}
                  to={item.slug === 'skins' ? `/categoria/${item.slug}` : itemPath}
                  className={`block px-3 py-2 text-sm font-display font-bold text-muted-foreground hover:text-primary hover:bg-secondary/50 rounded transition-colors tracking-wide uppercase ${depth > 0 ? 'pl-8' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.title || item.name}
                </Link>
              );
            };

            return renderMobileItem(page);
          })}

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
              {(isAdmin || isFundador || isStaff) && (
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
                  {isFundador ? "Fundador" : isAdmin ? "Admin" : "Painel"}
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
    </header >
  );
};