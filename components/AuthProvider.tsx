"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useCurrencyDisplayStore, type CurrencyDisplayMode } from "@/stores/currencyDisplayStore";
import { useGetUser } from "@/features/user/hooks/use-update-profile";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { usePostHog } from "posthog-js/react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((state) => state.setUser);
  const setCurrencyDisplayMode = useCurrencyDisplayStore((s) => s.setMode);
  const pathname = usePathname();
  const isAuthPage = pathname?.match(/^\/login|^\/signup|^\/forgot-password|^\/reset-password/);
  const { data: user, isPending } = useGetUser({ enabled: !isAuthPage });
  const posthog = usePostHog();

  useEffect(() => {
    if (user) {
      setUser(user);
      const cd = user.currencyDisplay;
      if (cd === "both" || cd === "real" || cd === "converted") {
        setCurrencyDisplayMode(cd as CurrencyDisplayMode);
      }
      posthog.identify(user.id, {
        email: user.email,
        name: user.name,
      });
    }
  }, [user, setUser, setCurrencyDisplayMode, posthog]);

  if (!isAuthPage && isPending) {
    return (
      <div className="min-h-screen bg-[#0b0b0b] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-white/50" />
      </div>
    );
  }

  return <>{children}</>;
}
