"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

const PUBLIC_PATHS = ["/login", "/signup", "/error"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s && !PUBLIC_PATHS.includes(pathname)) {
        router.replace("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname, router]);

  useEffect(() => {
    if (loading) return;

    const isPublic = PUBLIC_PATHS.includes(pathname);

    if (!session && !isPublic) {
      router.replace("/login");
    }
    if (session && isPublic) {
      router.replace("/alzheimer-predictions");
    }
  }, [session, loading, pathname, router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, loading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
