"use client";

import { useEffect, useState } from "react";
import { useSession } from "../lib/auth";
import { useAuthStore } from "@/stores/authStore";
export function Providers({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const setUser = useAuthStore(state => state.setUser);
  const session = useSession();

  useEffect(() => {
    if (session.data?.user) {
      setUser(session.data.user);
    }
  }, [session.data?.user]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return null;
  }

  return <>{children}</>;
}
