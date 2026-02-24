"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useGetUser } from "@/features/user/hooks/use-update-profile";
import { OnboardingModal } from "./onboarding-modal";
import { OnboardingTutorial, type OnboardingMode } from "./onboarding-tutorial";
import { APP_MODE } from "@/lib/app-mode";

export function OnboardingGate() {
  const pathname = usePathname();
  const { data: userData, isLoading } = useGetUser();
  const [showTutorial, setShowTutorial] = useState(false);
  const mode: OnboardingMode =
    APP_MODE === "organization" || pathname?.startsWith("/organization")
      ? "organization"
      : "personal";

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

    // Persist tutorial visibility independently per mode.
    const tutorialKey = `hasSeenTutorial_${mode}_${userData.id}`;
    const hasSeenTutorial = localStorage.getItem(tutorialKey);
    
    // Auto-start tutorial if profile is complete and tutorial is unseen
    if (!hasSeenTutorial && !isNewProfile) {
      console.log("OnboardingGate: Auto-starting tutorial for user", userData.id);
      setShowTutorial(true);
    }
  }, [userData, isNewProfile, isLoading, isAuthPage, mode]);



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
        onComplete={() => setShowTutorial(false)} 
      />
    );
  }


  return null;
}
