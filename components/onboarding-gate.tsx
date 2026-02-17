"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useGetUser } from "@/features/user/hooks/use-update-profile";
import { OnboardingModal } from "./onboarding-modal";
import { OnboardingTutorial } from "./onboarding-tutorial";

export function OnboardingGate() {
  const pathname = usePathname();
  const { data: userData, isLoading } = useGetUser();
  const [showTutorial, setShowTutorial] = useState(false);

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

    // Use a per-user key for tutorial persistence
    const tutorialKey = `hasSeenTutorial_${userData.id}`;
    const hasSeenTutorial = localStorage.getItem(tutorialKey);
    
    // Auto-start tutorial if profile is complete and tutorial is unseen
    if (!hasSeenTutorial && !isNewProfile) {
      console.log("OnboardingGate: Auto-starting tutorial for user", userData.id);
      setShowTutorial(true);
    }
  }, [userData, isNewProfile, isLoading, isAuthPage]);



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
        onComplete={() => setShowTutorial(false)} 
      />
    );
  }


  return null;
}

