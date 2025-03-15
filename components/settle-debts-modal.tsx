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
import { Expense, GroupBalance, User } from "@/api/modelSchema";
import { useSettleWithEveryone, useSettleWithOne } from "@/features/settle/hooks/use-splits";
import { useHandleEscapeToCloseModal } from "@/hooks/useHandleEscape";

interface SettleDebtsModalProps {
  isOpen: boolean;
  onClose: () => void;
  balances: GroupBalance[];
  groupId: string;
  members: User[]
}

// export function SettleDebtsModal({ isOpen, onClose, balances, groupId, members }: SettleDebtsModalProps) {
//   const { groups } = useGroups();
//   const { address, connectWallet, disconnectWallet, isConnected, isConnecting } = useWallet();

//   const settleWithOneMutation = useSettleWithOne(groupId);
//   const settleWithEveryoneMutation = useSettleWithEveryone(groupId);
//   // const { totalOwe } = calculateBalances(groups, address);

//   console.log(balances);

//   const totalOwe = balances?.filter(item => item.amount > 0).reduce((acc, expense) => {
//     return acc + expense.amount;
//   }, 0);

//   async function handleSettleOne() {
//     if (!isConnected) {
//       await connectWallet();
//     }
//     if (!address) return;
//     // settleWithOneMutation.mutate({
//     //   groupId,
//     //   address,
//     // });
//     console.log("Settle one");
//   }

//   function handleSettleEveryone() {
//     console.log("Settle everyone");

   
//     if (!address) return;

//     settleWithEveryoneMutation.mutate({
//       groupId,
//       address,
//     });
//   }

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

export function SettleDebtsModal({ isOpen, onClose, balances, groupId, members }: SettleDebtsModalProps) {
  const settleWithOneMutation = useSettleWithOne(groupId);
  const settleWithEveryoneMutation = useSettleWithEveryone(groupId);

  const totalOwe = balances?.filter(item => item.amount > 0).reduce((acc, expense) => {
    return acc + expense.amount;
  }, 0);

  function handleSettleEveryone() {
    console.log("Settle everyone");

    if (!address) return;

    settleWithEveryoneMutation.mutate({
      groupId,
      address,
    });
  }

  const { address, connectWallet, disconnectWallet, isConnected, isConnecting } = useWallet();


  const [isSettlingOne, setIsSettlingOne] = useState(false);
  const [isSettlingAll, setIsSettlingAll] = useState(false);
  const [showDebtorsList, setShowDebtorsList] = useState(false);
  const [selectedDebtor, setSelectedDebtor] = useState<DebtorInfo | null>(null);

  const debtors = balances?.filter(item => item.amount > 0).map(item => ({
    address: item.userId,
    name: members.find(member => member.id === item.userId)?.name || "Unknown",
    amount: item.amount,
  }));

  useHandleEscapeToCloseModal(isOpen, onClose);

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

                {isConnected && address && <div className="text-body-sm text-white/50 mb-4">
                  Connected with {address?.slice(0, 25) + "..."}
                </div>}

                <div className="space-y-3">
                  <motion.button
                    onClick={() => {
                      if (!isConnected) {
                        connectWallet();
                      } else{
                       disconnectWallet();
                      }
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full h-[42px] rounded-[15px] bg-[#1F1F23] text-sm font-medium text-white hover:bg-[#2a2a2e] transition-colors border border-white flex items-center justify-center gap-2"
                  >
                    {isConnected && address ? "Disconnect Wallet" : "Connect Wallet"}
                  </motion.button>

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
