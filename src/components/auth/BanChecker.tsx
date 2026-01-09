import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useModeration } from "@/hooks/useModeration";
import { useAuth } from "@/hooks/useAuth";

export const BanChecker = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { isBanned, isLoading } = useModeration();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && user && isBanned && location.pathname !== "/banned") {
      navigate("/banned");
    }
  }, [isBanned, isLoading, user, location.pathname, navigate]);

  return <>{children}</>;
};
