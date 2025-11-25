// providers/AuthProvider.tsx
"use client";

import { createSupabaseBrowserClient } from "@/utils/supabase/browserClient";
import useAuthStore from "@/zustand/stores/useAuthStore";
import { useEffect } from "react";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createSupabaseBrowserClient();
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    // Fetch the current session when component mounts
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
    };
    fetchUser();

    // Subscribe to auth changes (login, logout, token refresh, etc.)
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    // Cleanup listener on unmount
    return () => {
      listener.subscription.unsubscribe();
    };
  }, [supabase, setUser]);

  return <>{children}</>;
}
