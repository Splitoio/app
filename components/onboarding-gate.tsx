"use client";

import { useState, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useGetUser } from "@/features/user/hooks/use-update-profile";
import { useGetAllOrganizations } from "@/features/business/hooks/use-organizations";
import { OnboardingModal } from "./onboarding-modal";
import { OnboardingTutorial, type OnboardingMode } from "./onboarding-tutorial";
import { APP_MODE } from "@/lib/app-mode";

function isOrgAdmin(
  org: { userId: string; groupUsers?: { userId: string; role?: string | null }[] },
  currentUserId: string
): boolean {
  if (org.userId === currentUserId) return true;
  const membership = org.groupUsers?.find((gu) => gu.userId === currentUserId);
  return membership?.role === "ADMIN";
}

export function OnboardingGate() {
  const pathname = usePathname();
  const { data: userData, isLoading } = useGetUser();
  const { data: organizations = [], isFetched: orgsFetched } = useGetAllOrganizations({
    enabled: (APP_MODE === "organization" || pathname?.startsWith("/organization")) && !!userData?.id,
  });
  const [showTutorial, setShowTutorial] = useState(false);
  const mode: OnboardingMode =
    APP_MODE === "organization" || pathname?.startsWith("/organization")
      ? "organization"
      : "personal";

  const isOrgAdminUser = useMemo(() => {
    if (mode !== "organization" || !userData?.id || organizations.length === 0) return false;
    const orgIdMatch = pathname?.match(/^\/organization\/([^/]+)/);
    const currentOrgId = orgIdMatch?.[1] ?? organizations[0]?.id;
    const org = currentOrgId ? organizations.find((o) => o.id === currentOrgId) : organizations[0];
    return org ? isOrgAdmin(org, userData.id) : false;
  }, [mode, userData?.id, organizations, pathname]);

  const isAuthPage = pathname?.match(/^\/login|^\/signup/);
  const hasNoDisplayName =
    !userData?.name || (typeof userData.name === "string" && userData.name.trim() === "");
  const nameIsEmail =
    userData?.email &&
    userData?.name &&
    String(userData.name).trim().toLowerCase() === String(userData.email).trim().toLowerCase();
  
  const isNewProfile = userData && (hasNoDisplayName || nameIsEmail);

  useEffect(() => {
    if (!userData?.id || isAuthPage || isLoading) return;
    if (mode === "organization" && !orgsFetched) return;

    const tutorialKey = `hasSeenTutorial_${mode}_${userData.id}`;
    const hasSeenTutorial = localStorage.getItem(tutorialKey);

    if (!hasSeenTutorial && !isNewProfile) {
      setShowTutorial(true);
    }
  }, [userData, isNewProfile, isLoading, isAuthPage, mode, orgsFetched]);



  if (isAuthPage || isLoading || !userData) {
    return null;
  }

  // Phase 1: New Profile Setup
  if (isNewProfile) {
    return (
      <OnboardingModal 
        onComplete={() => {
          setShowTutorial(true);
        }} 
      />
    );
  }

  // Phase 2: Highlight Tour (Tutorial)
  if (showTutorial) {
    return (
      <OnboardingTutorial
        userId={userData.id}
        mode={mode}
        isOrgAdmin={mode === "organization" ? isOrgAdminUser : undefined}
        onComplete={() => setShowTutorial(false)}
      />
    );
  }


  return null;
}
