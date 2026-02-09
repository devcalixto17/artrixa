import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useModeration } from "@/hooks/useModeration";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";

export const BanChecker = ({ children }: { children: React.ReactNode }) => {
  const { user, signOut } = useAuth();
  const { isBanned, isKicked, activeModeration, isLoading } = useModeration();
  const navigate = useNavigate();
  const location = useLocation();
  const [showKickModal, setShowKickModal] = useState(false);

  useEffect(() => {
    if (!isLoading && user && isBanned && location.pathname !== "/banned") {
      navigate("/banned");
    }
  }, [isBanned, isLoading, user, location.pathname, navigate]);

  useEffect(() => {
    if (!isLoading && user && isKicked) {
      setShowKickModal(true);
    }
  }, [isKicked, isLoading, user]);

  const handleKickConfirmation = async () => {
    if (activeModeration) {
      // Deactivate the kick via RPC (bypasses RLS issues for the user)
      await supabase.rpc('acknowledge_user_kick');

      // Close modal and sign out
      setShowKickModal(false);
      await signOut();
    }
  };

  return (
    <>
      {children}

      <AlertDialog open={showKickModal} onOpenChange={setShowKickModal}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              Você foi desconectado (Kick)
            </AlertDialogTitle>
            <AlertDialogDescription className="text-foreground text-base">
              Um administrador desconectou você do site.
              <div className="mt-4 p-4 bg-muted rounded-lg border border-border italic text-muted-foreground font-medium">
                " {activeModeration?.reason || "Nenhum motivo fornecido."} "
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Você poderá realizar o login novamente assim que clicar no botão abaixo.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={handleKickConfirmation}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8"
            >
              OK, Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
