import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isFundador: boolean;
  isStaff: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isFundador, setIsFundador] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const lastCheckedUserId = useRef<string | null>(null);

  const checkRoles = useCallback(async (userId: string) => {
    // Prevent duplicate checks for the same user
    if (lastCheckedUserId.current === userId) return;
    lastCheckedUserId.current = userId;

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (!error && data) {
        setIsAdmin(data.role === "admin" || data.role === "fundador");
        setIsFundador(data.role === "fundador");
        setIsStaff(data.role === "staff");
      } else {
        setIsAdmin(false);
        setIsFundador(false);
        setIsStaff(false);
      }
    } catch (err) {
      console.error("Error checking roles:", err);
      setIsAdmin(false);
      setIsFundador(false);
      setIsStaff(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkRoles(session.user.id);
      }
      setIsLoading(false);
    });

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Use setTimeout to avoid deadlock
          setTimeout(() => {
            if (mounted) {
              checkRoles(session.user.id);
            }
          }, 0);
        } else {
          setIsAdmin(false);
          setIsFundador(false);
          setIsStaff(false);
          lastCheckedUserId.current = null;
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [checkRoles]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      return { error };
    }

    toast.success("Login realizado com sucesso!");
    navigate("/");
    return { error: null };
  };

  const signUp = async (email: string, password: string, username: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username,
        },
      },
    });

    if (error) {
      toast.error(error.message);
      return { error };
    }

    toast.success("Conta criada com sucesso!");
    navigate("/");
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setIsFundador(false);
    setIsStaff(false);
    toast.success("Logout realizado com sucesso!");
    navigate("/");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAdmin,
        isFundador,
        isStaff,
        isLoading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
