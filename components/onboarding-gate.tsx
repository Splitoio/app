"use client";

import { usePathname } from "next/navigation";
import { useGetUser } from "@/features/user/hooks/use-update-profile";
import { OnboardingModal } from "./onboarding-modal";

export function OnboardingGate() {
  const pathname = usePathname();
  const { data: userData, isLoading } = useGetUser();

  const isAuthPage = pathname?.match(/^\/login|^\/signup/);
  const hasNoDisplayName =
    !userData?.name || (typeof userData.name === "string" && userData.name.trim() === "");
  const nameIsEmail =
    userData?.email &&
    userData?.name &&
    String(userData.name).trim().toLowerCase() === String(userData.email).trim().toLowerCase();
  const isNewUser = userData && (hasNoDisplayName || nameIsEmail);

  if (isAuthPage || isLoading || !userData) {
    return null;
  }

  if (!isNewUser) {
    return null;
  }

  return <OnboardingModal onComplete={() => {}} />;
}
