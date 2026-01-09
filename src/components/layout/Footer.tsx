import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-surface-darker mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo & Description */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <span className="font-display text-xl font-bold text-primary">
                CS1.6
              </span>
              <span className="font-display text-xl font-bold text-foreground">
                MODS
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              O melhor portal de downloads para Counter-Strike 1.6. Plugins, skins, 
              mods e muito mais para turbinar seu servidor.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display font-bold text-foreground mb-4">
              Links Rápidos
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/downloads" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Downloads
                </Link>
              </li>
              <li>
                <Link to="/categoria/plugins" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Plugins
                </Link>
              </li>
              <li>
                <Link to="/categoria/skins-player" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Skins de Player
                </Link>
              </li>
              <li>
                <Link to="/categoria/skins-armas" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Skins de Armas
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-bold text-foreground mb-4">
              Comunidade
            </h4>
            <p className="text-sm text-muted-foreground">
              Junte-se à nossa comunidade de jogadores e desenvolvedores de CS 1.6.
            </p>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} CS1.6 Mods. Todos os direitos reservados.
            Feito por Calixto
          </p>
        </div>
      </div>
    </footer>
  );
};
