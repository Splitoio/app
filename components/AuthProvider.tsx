"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useGetUser } from "@/features/user/hooks/use-update-profile";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((state) => state.setUser);
  const { data: user, isPending } = useGetUser();
  const pathname = usePathname();
  const isAuthPage = pathname?.match(/^\/login|^\/signup/);

  useEffect(() => {
    if (user) {
      setUser(user);
    }
  }, [user, setUser]);

  if (!isAuthPage && isPending) {
    return (
      <div className="min-h-screen bg-[#0b0b0b] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-white/50" />
      </div>
    );
  }

  return <>{children}</>;
}
