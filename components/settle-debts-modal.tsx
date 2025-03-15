"use client";

import { X, Loader2, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useGroups } from "@/stores/groups";
import { calculateBalances } from "@/utils/calculations";
import { motion, AnimatePresence } from "framer-motion";
import { fadeIn, scaleIn } from "@/utils/animations";
import { toast } from "sonner";
import Image from "next/image";

interface SettleDebtsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DebtorInfo {
  address: string;
  name: string;
  amount: number;
}

interface Debt {
  from: string;
  to: string;
  amount: number;
}

export function SettleDebtsModal({ isOpen, onClose }: SettleDebtsModalProps) {
  const { address } = useWallet();
  const { groups } = useGroups();
  const balances = calculateBalances(groups, address);
  const totalOwe = balances.totalOwe;
  // Extract debts from groups
  const debts: Debt[] = groups.flatMap((group) =>
    group.debts ? group.debts : []
  );

  const [isSettlingOne, setIsSettlingOne] = useState(false);
  const [isSettlingAll, setIsSettlingAll] = useState(false);
  const [showDebtorsList, setShowDebtorsList] = useState(false);
  const [selectedDebtor, setSelectedDebtor] = useState<DebtorInfo | null>(null);

  // Get list of people the user owes money to
  const debtors: DebtorInfo[] = debts
    .filter((debt) => debt.from === address && debt.amount > 0)
    .map((debt) => {
      // Try to find the name from groups
      let name = debt.to;
      for (const group of groups) {
        const member = group.members?.find((m) => m === debt.to);
        if (member) {
          name = member.slice(0, 6) + "..." + member.slice(-4);
          break;
        }
      }
      return {
        address: debt.to,
        name: name,
        amount: debt.amount,
      };
    });

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

  const handleSettleOne = async () => {
    if (!selectedDebtor) {
      setShowDebtorsList(!showDebtorsList);
      return;
    }

    setIsSettlingOne(true);
    try {
      // Implement settle one logic here
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulating API call
      toast.success(`Successfully settled debt with ${selectedDebtor.name}`);
      onClose();
    } catch (error) {
      toast.error("Failed to settle debt. Please try again.");
    } finally {
      setIsSettlingOne(false);
    }
  };

  const handleSettleAll = async () => {
    setIsSettlingAll(true);
    try {
      // Implement settle all logic here
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulating API call
      toast.success("Successfully settled all debts");
      onClose();
    } catch (error) {
      toast.error("Failed to settle debts. Please try again.");
    } finally {
      setIsSettlingAll(false);
    }
  };

  const selectDebtor = (debtor: DebtorInfo) => {
    setSelectedDebtor(debtor);
    setShowDebtorsList(false);
  };

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
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[400px]">
            <motion.div className="animate-border-light" {...scaleIn}>
              <div className="relative rounded-[14.77px] bg-black p-3 lg:p-6">
                <div className="flex items-center justify-between mb-4 lg:mb-6">
                  <h2 className="text-xl lg:text-2xl font-semibold text-white tracking-[-0.03em]">
                    Settle Debts
                  </h2>
                  <button
                    onClick={onClose}
                    className="rounded-full p-1 lg:p-1.5 hover:bg-white/10 transition-colors"
                  >
                    <X className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <motion.button
                      whileHover={{ scale: isSettlingOne ? 1 : 1.02 }}
                      whileTap={{ scale: isSettlingOne ? 1 : 0.98 }}
                      className="w-full h-[42px] rounded-[15px] bg-[#1F1F23] text-sm font-medium text-white hover:bg-[#2a2a2e] transition-colors border border-white flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                      onClick={handleSettleOne}
                      disabled={isSettlingOne || isSettlingAll}
                    >
                      {isSettlingOne ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Image
                          src={"/settleOne.svg"}
                          alt="Settle One"
                          width={20}
                          height={20}
                        />
                      )}
                      {isSettlingOne
                        ? "Processing..."
                        : selectedDebtor
                        ? `Settle with ${
                            selectedDebtor.name
                          } ($${selectedDebtor.amount.toFixed(2)})`
                        : "Settle with one"}
                      {!isSettlingOne && !selectedDebtor && (
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            showDebtorsList ? "rotate-180" : ""
                          }`}
                        />
                      )}
                    </motion.button>

                    {/* Dropdown for selecting a person to settle with */}
                    {showDebtorsList && debtors.length > 0 && (
                      <div className="absolute top-full left-0 w-full mt-1 bg-[#1F1F23] rounded-[15px] border border-white/10 overflow-hidden z-10">
                        {debtors.map((debtor, index) => (
                          <button
                            key={debtor.address}
                            className="w-full px-4 py-3 text-left text-white hover:bg-white/10 flex items-center justify-between border-b border-white/5 last:border-b-0"
                            onClick={() => selectDebtor(debtor)}
                          >
                            <span>{debtor.name}</span>
                            <span className="text-[#FF4444]">
                              ${debtor.amount.toFixed(2)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {showDebtorsList && debtors.length === 0 && (
                      <div className="absolute top-full left-0 w-full mt-1 bg-[#1F1F23] rounded-[15px] border border-white/10 overflow-hidden z-10">
                        <div className="px-4 py-3 text-white/70 text-center">
                          No debts to settle
                        </div>
                      </div>
                    )}
                  </div>

                  <motion.button
                    whileHover={{ scale: isSettlingAll ? 1 : 1.02 }}
                    whileTap={{ scale: isSettlingAll ? 1 : 0.98 }}
                    className="w-full h-[50px] rounded-[15px] bg-[#1F1F23] text-body font-medium text-white hover:bg-[#2a2a2e] transition-colors border border-white flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    onClick={handleSettleAll}
                    disabled={isSettlingOne || isSettlingAll || totalOwe <= 0}
                  >
                    {isSettlingAll ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Image
                        src={"/settleEveryone.svg"}
                        alt="Settle Everyone"
                        width={20}
                        height={20}
                      />
                    )}
                    {isSettlingAll ? "Processing..." : "Settle with everyone"}{" "}
                    {!isSettlingAll && (
                      <span
                        className={
                          totalOwe > 0 ? "text-[#FF4444]" : "text-[#53e45d]"
                        }
                      >
                        (${totalOwe.toFixed(2)})
                      </span>
                    )}
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
