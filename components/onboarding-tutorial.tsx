"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  title: string;
  content: string;
  targetId: string;
  position: "top" | "bottom" | "left" | "right" | "center";
}

const PERSONAL_STEPS: Step[] = [
  {
    id: "welcome",
    title: "Welcome to Splito! 🚀",
    content: "Let's take a quick tour of Personal mode — where you manage splits with friends and flatmates.",
    targetId: "",
    position: "center",
  },
  {
    id: "dashboard",
    title: "Dashboard",
    content: "Your dashboard gives you an overview of all your balances — who you owe and who owes you.",
    targetId: "sidebar-dashboard-link",
    position: "right",
  },
  {
    id: "groups",
    title: "My Groups",
    content: "Create groups for trips, shared apartments, or any situation where you split expenses with others.",
    targetId: "sidebar-groups-link",
    position: "right",
  },
  {
    id: "friends",
    title: "Friends",
    content: "Add friends to quickly invite them into groups and keep track of balances across all your splits.",
    targetId: "sidebar-friends-link",
    position: "right",
  },
  {
    id: "finish",
    title: "You're all set! 🎉",
    content: "Start by creating a group or adding friends.",
    targetId: "",
    position: "center",
  },
];

const ORG_STEPS: Step[] = [
  {
    id: "welcome",
    title: "Welcome to Organization Mode! 🏢",
    content: "This is where you manage your business — invoices, income streams, contracts, and team members.",
    targetId: "",
    position: "center",
  },
  {
    id: "dashboard",
    title: "Organization Dashboard",
    content: "Get a bird's-eye view of your team, invoices, income streams, and contracts all in one place.",
    targetId: "sidebar-dashboard-link",
    position: "right",
  },
  {
    id: "invoices",
    title: "Invoices",
    content: "Create and track professional invoices. Members can raise invoices, and admins can approve or decline them.",
    targetId: "sidebar-org-invoices-link",
    position: "right",
  },
  {
    id: "streams",
    title: "Income Streams",
    content: "Set up recurring revenue streams to monitor expected income for your organization.",
    targetId: "sidebar-org-streams-link",
    position: "right",
  },
  {
    id: "activity",
    title: "Activity",
    content: "Track all organization activity — invoices created, approved, declined, and more.",
    targetId: "sidebar-org-activity-link",
    position: "right",
  },
  {
    id: "contracts",
    title: "Contracts",
    content: "Create and manage contracts for your team members with compensation details, scope of work, and more.",
    targetId: "sidebar-org-contracts-link",
    position: "right",
  },
  {
    id: "members",
    title: "Members",
    content: "Invite people to your organization and manage their roles and permissions.",
    targetId: "sidebar-org-members-link",
    position: "right",
  },
  {
    id: "org-switcher",
    title: "Switch Organizations",
    content: "Use the organization switcher at the bottom of the sidebar to manage multiple organizations.",
    targetId: "sidebar-org-switcher-button",
    position: "right",
  },
  {
    id: "finish",
    title: "You're ready! 🎊",
    content: "Start by creating invoices, adding members, or setting up income streams for your organization.",
    targetId: "",
    position: "center",
  },
];

export type OnboardingMode = "personal" | "organization";

export function OnboardingTutorial({
  onComplete,
  userId,
  mode,
}: {
  onComplete: () => void;
  userId?: string;
  mode: OnboardingMode;
}) {
  const steps = mode === "organization" ? ORG_STEPS : PERSONAL_STEPS;
  const storageKey = userId
    ? `hasSeenTutorial_${mode}_${userId}`
    : null;

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const markSeen = useCallback(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, "true");
    }
  }, [storageKey]);

  const handleNext = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      markSeen();
      onComplete();
    }
  }, [currentStepIndex, steps.length, markSeen, onComplete]);

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleSkip = () => {
    markSeen();
    onComplete();
  };

  const updateSpotlight = useCallback(() => {
    const step = steps[currentStepIndex];
    if (step.targetId) {
      const element = document.getElementById(step.targetId);
      setTargetRect(element ? element.getBoundingClientRect() : null);
    } else {
      setTargetRect(null);
    }
  }, [currentStepIndex, steps]);

  useEffect(() => {
    updateSpotlight();
    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight);
    return () => {
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight);
    };
  }, [updateSpotlight]);

  const step = steps[currentStepIndex];

  return (
    <div className="fixed inset-0 z-[1000] pointer-events-none">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 pointer-events-auto"
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
            className="absolute rounded-xl border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] z-[1001]"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
      </AnimatePresence>

      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          key={`${mode}-${currentStepIndex}`}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className={cn(
            "pointer-events-auto w-full max-w-md rounded-2xl bg-[#18181b] border border-[#27272a] p-6 shadow-2xl z-[1002]",
            targetRect ? "absolute" : "relative"
          )}
          style={
            targetRect
              ? {
                  position: "absolute" as const,
                  left:
                    step.position === "right"
                      ? Math.min(targetRect.right + 24, window.innerWidth - 420)
                      : Math.max(
                          20,
                          Math.min(
                            targetRect.left + targetRect.width / 2 - 192,
                            window.innerWidth - 404
                          )
                        ),
                  top:
                    step.position === "bottom"
                      ? targetRect.bottom + 24
                      : step.position === "top"
                        ? undefined
                        : Math.max(
                            20,
                            Math.min(
                              targetRect.top + targetRect.height / 2 - 100,
                              window.innerHeight - 300
                            )
                          ),
                  bottom:
                    step.position === "top"
                      ? window.innerHeight - targetRect.top + 24
                      : undefined,
                }
              : {}
          }
        >
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-white">{step.title}</h3>
            <button
              onClick={handleSkip}
              className="text-white/40 hover:text-white transition-colors p-1"
            >
              <X size={18} />
            </button>
          </div>

          <p className="text-zinc-400 mb-6 leading-relaxed text-sm">
            {step.content}
          </p>

          <div className="space-y-4">
            <div className="flex gap-1 justify-center">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 rounded-full transition-all",
                    i === currentStepIndex
                      ? "w-4 bg-white"
                      : "w-1 bg-white/20"
                  )}
                />
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {currentStepIndex > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrev}
                    className="text-white/60 hover:text-white h-8 px-2"
                  >
                    <ChevronLeft size={16} className="mr-1" />
                    Back
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="text-white/40 hover:text-white/90 h-8 px-2"
                >
                  Skip Tour
                </Button>
              </div>

              <Button
                size="sm"
                onClick={handleNext}
                className="bg-white text-black hover:bg-white/90 h-8 px-4"
              >
                {currentStepIndex === steps.length - 1 ? "Finish" : "Next"}
                {currentStepIndex !== steps.length - 1 && (
                  <ChevronRight size={16} className="ml-1" />
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
