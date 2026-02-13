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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
      <div
        className="relative w-full max-w-md rounded-xl border border-[#27272a] bg-[#18181b] p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <h2
          id="onboarding-title"
          className="text-lg font-semibold text-white"
        >
          Welcome! Set up your profile
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          You can change these later in Settings.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="onboarding-display-name"
              className="mb-1.5 block text-sm font-medium text-zinc-300"
            >
              Display name <span className="text-red-400">*</span>
            </label>
            <input
              id="onboarding-display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How should we call you?"
              className="w-full rounded-lg border border-[#3f3f46] bg-[#27272a] px-3 py-2 text-white placeholder:text-zinc-500 focus:border-[#71717a] focus:outline-none focus:ring-1 focus:ring-[#71717a]"
              autoFocus
              required
              minLength={1}
              maxLength={100}
            />
          </div>

          <div className="rounded-lg border border-[#3f3f46] bg-[#27272a]/50 px-3 py-2.5">
            <p className="text-sm text-zinc-400">
              Default currency:{" "}
              <span className="font-medium text-white">
                {PLATFORM_DEFAULT_CURRENCY}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Amounts will be shown in this currency. You can change it in
              Settings.
            </p>
          </div>

          <Button
            type="submit"
            disabled={!canSubmit}
            className="w-full"
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
  );
}
