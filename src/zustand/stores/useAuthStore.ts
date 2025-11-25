import { User } from "@supabase/supabase-js";
import { create } from "zustand";

type Store = {
  user: User | null;
  setUser: (user: Store["user"]) => void;
};

const useAuthStore = create<Store>((set) => ({
  user: null,
  setUser: (user) => set(() => ({ user })),
}));

export default useAuthStore;
