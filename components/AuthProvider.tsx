"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useGetUser } from "@/features/user/hooks/use-update-profile";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((state) => state.setUser);
  const { data: user } = useGetUser();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      setUser(user);

      // Check if user doesn't have a stellar account
      if (!user.stellarAccount) {
        // Show reminder toast with action button
        toast.message("You don't have a Stellar wallet connected", {
          description: "Connect a wallet to send and receive payments",
          action: {
            label: "Connect Wallet",
            onClick: () => router.push("/settings"),
          },
          duration: 6000,
        });
      }
    }
  }, [user, setUser, router]);

  return <>{children}</>;
}
