"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

interface AddFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddFriendsModal({ isOpen, onClose }: AddFriendsModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 h-screen w-screen">
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[450px]">
        <div className="animate-border-light">
          <div className="relative rounded-[14.77px] bg-black p-4 lg:p-8">
            <div className="flex items-center justify-between mb-6 lg:mb-8">
              <h2 className="text-2xl lg:text-[29.28px] font-semibold text-white tracking-[-0.03em] font-instrument-sans">
                Add Friends
              </h2>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 lg:p-2 hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
              </button>
            </div>

            <div className="space-y-4 lg:space-y-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter name or email address"
                  className="w-full h-[45px] lg:h-[52px] bg-white/15 rounded-[40px] pl-[60px] lg:pl-[72px] pr-4 lg:pr-6 text-base lg:text-[20px] font-base tracking-[-0.03em] text-white/30 font-instrument-sans focus:outline-none placeholder:text-white/30"
                />
                <span className="absolute left-4 lg:left-6 top-1/2 -translate-y-1/2 text-base lg:text-[20px] font-semibold tracking-[-0.03em] text-white font-instrument-sans">
                  To:
                </span>
              </div>

              <div className="flex justify-end">
                <button className="rounded-[14.77px] bg-white/15 px-4 lg:px-6 py-2 lg:py-3 text-sm lg:text-[16.94px] font-base tracking-[-0.04em] text-white font-instrument-sans border border-white hover:bg-white/10 transition-colors">
                  Send Invite
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
