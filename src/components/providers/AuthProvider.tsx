// providers/AuthProvider.tsx
"use client";

import { createSupabaseBrowserClient } from "@/utils/supabase/browserClient";
import useAuthStore from "@/zustand/stores/useAuthStore";
import { Center } from "@mantine/core";
import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import CustomLoader from "../common/CustomLoader";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createSupabaseBrowserClient();
  const { setUser, setIsLoading, isLoading } = useAuthStore(
    useShallow((state) => ({
      setUser: state.setUser,
      setIsLoading: state.setIsLoading,
      isLoading: state.isLoading,
    }))
  );

  useEffect(() => {
    // Fetch the current session when component mounts
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
      setIsLoading(false);
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
  }, [supabase, setUser, setIsLoading]);

  if (isLoading) {
    return (
      <Center h={"100vh"}>
        <CustomLoader />
      </Center>
    );
  }

  return <>{children}</>;
}
