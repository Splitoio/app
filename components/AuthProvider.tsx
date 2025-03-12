"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useGetUser } from "@/features/user/hooks/use-update-profile";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((state) => state.setUser);
  const { data: user } = useGetUser();

  useEffect(() => {
    if (user) {
      setUser(user);
    }
  }, [user, setUser]);

  return <>{children}</>;
}
