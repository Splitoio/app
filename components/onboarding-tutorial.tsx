"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePathname, useRouter, useParams } from "next/navigation";

interface Step {
  id: string;
  title: string;
  content: string;
  targetId: string;
  position: "top" | "bottom" | "left" | "right" | "center";
  interactive?: boolean;
  autoNext?: (context: { pathname: string; isOrg: boolean; hasGroups: boolean; hasOrgs: boolean; params: any }) => boolean;
  skippable?: boolean;
}

const STEPS: Step[] = [
  {
    id: "welcome",
    title: "Welcome to Splito! 🚀",
    content: "Let's take a quick tour. Splito helps you manage both personal expenses with friends and professional business finances.",
    targetId: "",
    position: "center",
  },
  {
    id: "personal-mode-intro",
    title: "Personal Mode",
    content: "This is where you manage splits with friends and flatmates. Let's look at the key features.",
    targetId: "",
    position: "center",
  },
  {
    id: "group-expenses",
    title: "Manage Expenses",
    content: "In Personal mode, you can see all your bill splits, settle debts, and keep track of who owes what.",
    targetId: "sidebar-expenses-link",
    position: "right",
  },
  {
    id: "group-activity",
    title: "Track Activity",
    content: "The Activity feed shows a real-time history of every expense added and every debt settled.",
    targetId: "sidebar-activity-link",
    position: "right",
  },
  {
    id: "group-members",
    title: "Invite Friends",
    content: "You can easily add friends or flatmates to your groups to start splitting instantly.",
    targetId: "sidebar-members-link",
    position: "right",
  },
  {
    id: "group-selector",
    title: "Create Groups",
    content: "Open the group selector to switch between different groups or start a new one!",
    targetId: "sidebar-group-dropdown",
    position: "right",
    interactive: true,
    autoNext: () => !!document.getElementById("sidebar-create-group-link"),
  },
  {
    id: "show-create-group",
    title: "Start a New Group",
    content: "Whenever you're ready, click here to set up a new expense group for a trip or shared home.",
    targetId: "sidebar-create-group-link",
    position: "right",
  },
  {
    id: "open-profile",
    title: "Switching Modes",
    content: "Splito has a dedicated mode for businesses. Open your profile to see the switcher.",
    targetId: "sidebar-profile-dropdown",
    position: "right",
    interactive: true,
    autoNext: () => !!document.getElementById("sidebar-mode-switcher-row"),
  },
  {
    id: "switch-to-org",
    title: "Organization Mode",
    content: "Switch to Organization mode to manage professional invoices and business operations.",
    targetId: "sidebar-mode-switcher-row",
    position: "right",
    interactive: true,
    autoNext: ({ isOrg }) => isOrg,
  },
  {
    id: "org-invoices",
    title: "Invoices & Billing",
    content: "Organization mode allows you to generate professional invoices and track client payments.",
    targetId: "sidebar-org-invoices-link",
    position: "right",
  },
  {
    id: "org-streams",
    title: "Financial Streams",
    content: "Set up and monitor recurring revenue streams for your business operations.",
    targetId: "sidebar-org-streams-link",
    position: "right",
  },
  {
    id: "org-contracts",
    title: "Contracts",
    content: "Keep all your business agreements and legal documents organized in one place.",
    targetId: "sidebar-org-contracts-link",
    position: "right",
  },
  {
    id: "org-selector",
    title: "Organization Hub",
    content: "In Organization mode, you can manage multiple business entities from here.",
    targetId: "sidebar-org-dropdown",
    position: "right",
    interactive: true,
    autoNext: () => !!document.getElementById("sidebar-create-org-link"),
  },
  {
    id: "show-create-org",
    title: "Build Your Business",
    content: "You can create a new organization here to start managing your team's finances officially.",
    targetId: "sidebar-create-org-link",
    position: "right",
  },
  {
    id: "finish",
    title: "Tour Complete! 🎊",
    content: "You're all set to explore Splito. Switch modes anytime to manage your personal or business world.",
    targetId: "",
    position: "center",
  },
];


export function OnboardingTutorial({ 
  onComplete, 
  userId 
}: { 
  onComplete: () => void;
  userId?: string;
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const pathname = usePathname();
  const params = useParams();
  const isOrg = pathname.startsWith("/organization");

  const handleNext = useCallback(() => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      if (userId) {
        localStorage.setItem(`hasSeenTutorial_${userId}`, "true");
      }
      onComplete();
    }
  }, [currentStepIndex, userId, onComplete]);

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleSkip = () => {
    if (userId) {
      localStorage.setItem(`hasSeenTutorial_${userId}`, "true");
    }
    onComplete();
  };

  const updateSpotlight = useCallback(() => {
    const step = STEPS[currentStepIndex];
    if (step.targetId) {
      const element = document.getElementById(step.targetId);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    } else {
      setTargetRect(null);
    }
  }, [currentStepIndex]);

  useEffect(() => {
    updateSpotlight();
    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight);
    return () => {
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight);
    };
  }, [updateSpotlight]);

  useEffect(() => {
    const step = STEPS[currentStepIndex];
    if (!step.interactive || !step.targetId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (step.id === "fill-group-name" || step.id === "org-modal-finish" || step.id === "wallet-address-entry") {

          handleNext();
        }
      }
    };

    const el = document.getElementById(step.targetId);
    el?.addEventListener("keydown", handleKeyDown);
    return () => el?.removeEventListener("keydown", handleKeyDown);
  }, [currentStepIndex, handleNext]);

  useEffect(() => {
    const checkAutoNext = () => {

      const step = STEPS[currentStepIndex];
      if (step.autoNext) {
        const shouldNext = step.autoNext({ 
          pathname, 
          isOrg, 
          hasGroups: false, 
          hasOrgs: false,
          params 
        });
        if (shouldNext) {
          handleNext();
        }
      }
    };

    checkAutoNext();

    const observer = new MutationObserver(checkAutoNext);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [pathname, isOrg, currentStepIndex, params, handleNext]);



  const step = STEPS[currentStepIndex];

  return (
    <div className="fixed inset-0 z-[1000] pointer-events-none">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "absolute inset-0 bg-black/40 pointer-events-auto cursor-pointer",
            step.interactive && "pointer-events-none"
          )}
          onClick={step.skippable ? handleSkip : undefined}
        />
      </AnimatePresence>

      <AnimatePresence>
        {targetRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: targetRect.left - 8,
              y: targetRect.top - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
            className={cn(
              "absolute rounded-xl border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] z-[1001]",
              step.interactive && "pointer-events-none"
            )}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
      </AnimatePresence>


      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          key={currentStepIndex}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className={cn(
            "pointer-events-auto w-full max-w-md rounded-2xl bg-[#18181b] border border-[#27272a] p-6 shadow-2xl z-[1002]",
            targetRect ? "absolute" : "relative"
          )}
          style={targetRect ? {
            position: "absolute",
            left: step.position === "right" 
              ? Math.min(targetRect.right + 24, window.innerWidth - 420) 
              : Math.max(20, Math.min(targetRect.left + targetRect.width/2 - 192, window.innerWidth - 404)),
            top: step.position === "bottom" 
              ? targetRect.bottom + 24 
              : step.position === "top" 
                ? undefined 
                : Math.max(20, Math.min(targetRect.top + targetRect.height/2 - 100, window.innerHeight - 300)),
            bottom: step.position === "top" 
              ? window.innerHeight - targetRect.top + 24 
              : undefined,
          } : {}}
        >
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-white">{step.title}</h3>
            <button onClick={handleSkip} className="text-white/40 hover:text-white transition-colors p-1">
              <X size={18} />
            </button>
          </div>
          
          <p className="text-zinc-400 mb-6 leading-relaxed text-sm">
            {step.content}
          </p>

          <div className="space-y-4">
            <div className="flex gap-1 justify-center">
              {STEPS.map((_, i) => (
                <div key={i} className={cn("h-1 rounded-full transition-all", i === currentStepIndex ? "w-4 bg-white" : "w-1 bg-white/20")} />
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {currentStepIndex > 0 && (
                  <Button variant="ghost" size="sm" onClick={handlePrev} className="text-white/60 hover:text-white h-8 px-2">
                    <ChevronLeft size={16} className="mr-1" />
                    Back
                  </Button>
                )}
                
                <Button variant="ghost" size="sm" onClick={handleSkip} className="text-white/40 hover:text-white/90 h-8 px-2">
                  Skip Tour
                </Button>
              </div>

              <Button size="sm" onClick={handleNext} className="bg-white text-black hover:bg-white/90 h-8 px-4">
                {currentStepIndex === STEPS.length - 1 ? "Finish" : "Next"}
                {currentStepIndex !== STEPS.length - 1 && <ChevronRight size={16} className="ml-1" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>


    </div>
  );
}



