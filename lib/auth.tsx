"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type UserRole = "Administrador" | "Clínico" | "Académico" | null;

type AuthContextType = {
  session: Session | null;
  user: User | null;
  role: UserRole;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

let _cachedAccessToken: string | null = null;

export async function getAccessToken(): Promise<string | null> {
  if (_cachedAccessToken) return _cachedAccessToken;
  const { data } = await supabase.auth.getSession();
  _cachedAccessToken = data.session?.access_token ?? null;
  return _cachedAccessToken;
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const base64 = token.split(".")[1];
  const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(json);
}

function extractRoleFromJwt(token: string): UserRole {
  try {
    const payload = decodeJwtPayload(token);
    const role = payload.user_role as string | undefined;
    if (role === "Administrador" || role === "Clínico" || role === "Académico") {
      return role;
    }
  } catch {
    // JWT decode failed — fall through to DB query
  }
  return null;
}

async function fetchRoleFromDb(userId: string): Promise<UserRole> {
  const { data, error } = await supabase
    .from("usuario")
    .select("role")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  const role = data.role as string;
  if (role === "Administrador" || role === "Clínico" || role === "Académico") {
    return role;
  }
  return null;
}

async function resolveRole(session: Session): Promise<UserRole> {
  const jwtRole = extractRoleFromJwt(session.access_token);
  if (jwtRole) return jwtRole;
  return fetchRoleFromDb(session.user.id);
}

const PUBLIC_PATHS = ["/login", "/signup", "/error"];

const ROLE_ROUTES: Record<string, UserRole[]> = {
  "/alzheimer-predictions": ["Clínico"],
  "/reports": ["Clínico"],
  "/dashboard": ["Administrador"],
  "/users": ["Administrador"],
  "/estudios": ["Clínico"],
  "/Visualization": ["Clínico"],
};

export function getDefaultRoute(role: UserRole): string {
  if (role === "Administrador") return "/dashboard";
  return "/alzheimer-predictions";
}

export function isRouteAllowed(pathname: string, role: UserRole): boolean {
  if (!role) return false;

  for (const [route, allowedRoles] of Object.entries(ROLE_ROUTES)) {
    if (pathname === route || pathname.startsWith(route + "/")) {
      return allowedRoles.includes(role);
    }
  }

  return true;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const updateSessionAndRole = useCallback(async (s: Session | null) => {
    _cachedAccessToken = s?.access_token ?? null;
    setSession(s);
    if (s) {
      const r = await resolveRole(s);
      setRole(r);
    } else {
      setRole(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      updateSessionAndRole(s)
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [updateSessionAndRole]);

  useEffect(() => {
    if (loading) return;

    const isPublic = PUBLIC_PATHS.includes(pathname);

    if (!session && !isPublic) {
      router.replace("/login");
      return;
    }

    if (session && isPublic) {
      router.replace(getDefaultRoute(role));
      return;
    }

    if (session && role && !isPublic && !isRouteAllowed(pathname, role)) {
      router.replace(getDefaultRoute(role));
    }
  }, [session, role, loading, pathname, router]);

  const signOut = async () => {
    _cachedAccessToken = null;
    await supabase.auth.signOut();
    setRole(null);
    router.replace("/login");
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, role, loading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
