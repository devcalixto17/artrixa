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
    // Only show if we have an active kick with a reason (or it's explicitly a kick type)
    // and we're not currently in the process of acknowledging it
    if (!isLoading && user && isKicked && activeModeration && activeModeration.is_active) {
      setShowKickModal(true);
    } else if (!isKicked || !user) {
      setShowKickModal(false);
    }
  }, [isKicked, isLoading, user, activeModeration]);

  const handleKickConfirmation = async () => {
    if (activeModeration && activeModeration.is_active) {
      // Deactivate the kick via RPC (bypasses RLS issues for the user)
      await supabase.rpc('acknowledge_user_kick');

      // Close modal immediately
      setShowKickModal(false);

      // Delay signout slightly to ensure state is clean
      setTimeout(async () => {
        await signOut();
      }, 100);
    } else {
      // If we somehow lost the record but modal is open, just sign out
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
