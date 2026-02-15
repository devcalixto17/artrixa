import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useEffect } from "react";

interface FounderGuardProps {
    children: React.ReactNode;
}

export const FounderGuard = ({ children }: FounderGuardProps) => {
    const { isFundador, isLoading } = useAuth();

    useEffect(() => {
        if (!isLoading && !isFundador) {
            toast.error("Acesso negado. Apenas fundadores podem acessar esta página.");
        }
    }, [isFundador, isLoading]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!isFundador) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};
