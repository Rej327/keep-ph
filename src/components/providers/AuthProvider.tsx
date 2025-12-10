// providers/AuthProvider.tsx
"use client";

import { createSupabaseBrowserClient } from "@/utils/supabase/browserClient";
import useAuthStore from "@/zustand/stores/useAuthStore";
import { Center } from "@mantine/core";
import { useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import CustomLoader from "../common/CustomLoader";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Create Supabase client only once
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const { setUser, setIsLoading, isLoading } = useAuthStore(
    useShallow((state) => ({
      setUser: state.setUser,
      setIsLoading: state.setIsLoading,
      isLoading: state.isLoading,
    }))
  );

  useEffect(() => {
    const fetchSession = async () => {
      // 1. **Initial Load:** Get the current session
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("Error fetching session:", error);
      }

      // Use session.user (or null) to set the initial user state
      // This is consistent with what the listener provides.
      setUser(session?.user ?? null);
      setIsLoading(false);
    };

    fetchSession();

    // 2. **State Changes:** Listen for authentication events
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // The session object contains the user. Set the full user object.
        setUser(session?.user ?? null);

        // Ensure loading is false after a state change event
        // (though this is primarily handled by the initial fetch)
        if (isLoading) {
          setIsLoading(false);
        }
      }
    );

    // 3. **Cleanup:** Unsubscribe when the component unmounts
    return () => listener.subscription.unsubscribe();
  }, [supabase, setUser, setIsLoading, isLoading]); // Added isLoading to dependencies

  if (isLoading) {
    return (
      <Center h="100vh">
        <CustomLoader />
      </Center>
    );
  }

  return <>{children}</>;
}
