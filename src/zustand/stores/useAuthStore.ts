import { User } from "@supabase/supabase-js";
import { create } from "zustand";

type Store = {
  user: User | null;
  isLoading: boolean;
  setUser: (user: Store["user"]) => void;
  setIsLoading: (loading: boolean) => void;
};

const useAuthStore = create<Store>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set(() => ({ user })),
  setIsLoading: (loading) => set(() => ({ isLoading: loading })),
}));

export default useAuthStore;
