"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useGroups } from "@/stores/groups";
import { calculateBalances } from "@/utils/calculations";
import { motion, AnimatePresence } from "framer-motion";
import { fadeIn, scaleIn } from "@/utils/animations";

interface SettleDebtsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettleDebtsModal({ isOpen, onClose }: SettleDebtsModalProps) {
  const { address } = useWallet();
  const { groups } = useGroups();
  const { totalOwe } = calculateBalances(groups, address);

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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 h-screen w-screen"
          {...fadeIn}
        >
          <motion.div
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[450px]">
            <motion.div className="animate-border-light" {...scaleIn}>
              <div className="relative rounded-[14.77px] bg-black p-4 lg:p-8">
                <div className="flex items-center justify-between mb-6 lg:mb-8">
                  <h2 className="text-2xl lg:text-[29.28px] font-semibold text-white tracking-[-0.03em] font-instrument-sans">
                    Settle Debts
                  </h2>
                  <button
                    onClick={onClose}
                    className="rounded-full p-1.5 lg:p-2 hover:bg-white/10 transition-colors"
                  >
                    <X className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
                  </button>
                </div>

                <div className="space-y-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full h-[50px] rounded-[15px] bg-[#1F1F23] text-body font-medium text-white hover:bg-[#2a2a2e] transition-colors border border-white"
                  >
                    Settle with one
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full h-[50px] rounded-[15px] bg-[#1F1F23] text-body font-medium text-white hover:bg-[#2a2a2e] transition-colors border border-white"
                  >
                    Settle with everyone{" "}
                    <span
                      className={
                        totalOwe > 0 ? "text-[#FF4444]" : "text-[#53e45d]"
                      }
                    >
                      (${totalOwe.toFixed(2)})
                    </span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
