import { Button } from "@/components/ui/button";
import { Download, Gamepad2 } from "lucide-react";
import { Link } from "react-router-dom";
import heroBanner from "@/assets/hero-banner.jpg";

export const HeroSection = () => {
  return (
    <section className="relative rounded-xl overflow-hidden mb-8">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroBanner}
          alt="Counter-Strike 1.6"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 px-8 py-16 md:py-24">
        <div className="max-w-2xl">
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-4">
            <span className="text-primary neon-glow">CS 1.6</span>
            <br />
            <span className="text-foreground">MODS & SKINS</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl">
            O maior acervo de plugins, skins de players, skins de armas e mods 
            para Counter-Strike 1.6. Turbine seu servidor com conteúdo exclusivo!
          </p>
          <div className="flex flex-wrap gap-4">
            <Button variant="hero" size="xl" asChild>
              <Link to="https://discord.gg/ndvHVfhVVa">
                <Download className="w-5 h-5" />
                DISCORD
              </Link>
            </Button>
            <Button variant="outline" size="xl" asChild>
              <Link to="/categoria/plugins">
                <Gamepad2 className="w-5 h-5" />
                Explorar Plugins
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
