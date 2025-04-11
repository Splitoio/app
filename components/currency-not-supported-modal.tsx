"use client";

import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fadeIn, scaleIn } from "@/utils/animations";
import Link from "next/link";

interface CurrencyNotSupportedModalProps {
  isOpen: boolean;
  onClose: () => void;
  currencyName: string;
  username: string;
}

export function CurrencyNotSupportedModal({
  isOpen,
  onClose,
  currencyName = "USDT (Base)",
  username = "Kamala",
}: CurrencyNotSupportedModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 h-screen w-screen"
          {...fadeIn}
        >
          <motion.div
            className="fixed inset-0 bg-black/70 brightness-50"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[500px]">
            <motion.div className="relative z-10 rounded-3xl overflow-hidden" {...scaleIn}>
              <div className="flex flex-col bg-black rounded-3xl">
                {/* Modal Header */}
                <div className="w-full p-6 pb-4">
                  <div className="flex items-center justify-end">
                    <button
                      onClick={onClose}
                      className="rounded-full p-1.5 hover:bg-white/10 transition-colors"
                    >
                      <X className="h-5 w-5 text-white/70" />
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="px-8 pb-8 flex flex-col items-center text-center">
                  <h2 className="text-2xl font-semibold text-white mb-5">
                    {currencyName} not accepted by {username}
                  </h2>

                  <p className="text-white/70 text-lg mb-12">
                    {currencyName} is not accepted by {username}. Please ask
                    them to change this in settings before adding them to the
                    group
                  </p>

                  <button
                    onClick={onClose}
                    className="w-full h-[58px] flex items-center justify-center
                    bg-white rounded-full
                    text-lg font-semibold text-black
                    transition-all duration-200 hover:bg-white/90"
                  >
                    Add others
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
