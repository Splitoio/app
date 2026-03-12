"use client";

import { useState, useEffect } from "react";
import { useUpdateUser } from "@/features/user/hooks/use-update-profile";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const PLATFORM_DEFAULT_CURRENCY = "USD";

interface OnboardingModalProps {
  onComplete: () => void;
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [displayName, setDisplayName] = useState("");
  const { mutate: updateUser, isPending } = useUpdateUser();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = displayName.trim();
    if (!name) return;
    updateUser(
      { name, currency: PLATFORM_DEFAULT_CURRENCY },
      {
        onSuccess: () => {
          onComplete();
        },
      }
    );
  };

  const canSubmit = displayName.trim().length > 0 && !isPending;

  return (
    <div className="fixed inset-0 z-[100] h-screen w-screen">
      <div className="fixed inset-0 bg-black/80" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[420px] px-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-title"
          className="relative"
          style={{
            background: "linear-gradient(160deg, #141414 0%, #0f0f0f 100%)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: 24,
            padding: 24,
            boxShadow: "0 40px 100px rgba(0,0,0,0.8)",
          }}
        >
          <h2
            id="onboarding-title"
            className="text-[20px] font-extrabold text-white tracking-[-0.02em]"
          >
            Welcome! Set up your profile
          </h2>
          <p className="mt-1 text-[13px] text-zinc-400">
            You can change these later in Settings.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="onboarding-display-name"
                className="mb-1.5 block text-[13px] font-medium text-zinc-300"
              >
                Display name <span className="text-red-400">*</span>
              </label>
              <input
                id="onboarding-display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How should we call you?"
                className="w-full rounded-[14px] border border-white/10 bg-white/5 px-3 py-2.5 text-[14px] text-white placeholder:text-zinc-500 focus:border-white/30 focus:outline-none focus:ring-0"
                autoFocus
                required
                minLength={1}
                maxLength={100}
              />
            </div>

            <div className="rounded-[14px] border border-white/10 bg-white/[0.03] px-3.5 py-3">
              <p className="text-[13px] text-zinc-300">
                Default currency:{" "}
                <span className="font-semibold text-white">
                  {PLATFORM_DEFAULT_CURRENCY}
                </span>
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                Amounts will be shown in this currency. You can change it in
                Settings.
              </p>
            </div>

            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full h-11 rounded-[14px] font-semibold"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
