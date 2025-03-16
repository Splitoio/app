"use client";

import { X, Loader2, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { motion, AnimatePresence } from "framer-motion";
import { fadeIn, scaleIn } from "@/utils/animations";
import { toast } from "sonner";
import Image from "next/image";
import { GroupBalance, User } from "@/api/modelSchema";
import { useSettleDebt } from "@/features/settle/hooks/use-splits";
import { useHandleEscapeToCloseModal } from "@/hooks/useHandleEscape";
import { useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/constants";

interface SettleDebtsModalProps {
  isOpen: boolean;
  onClose: () => void;
  balances: GroupBalance[];
  groupId: string;
  members: User[];
}

export function SettleDebtsModal({
  isOpen,
  onClose,
  balances,
  groupId,
  members,
}: SettleDebtsModalProps) {
  const { address, connectWallet, disconnectWallet, isConnected } = useWallet();
  const [showDebtorsList, setShowDebtorsList] = useState(false);
  const settleDebtMutation = useSettleDebt(groupId);
  const queryClient = useQueryClient();
  useHandleEscapeToCloseModal(isOpen, onClose);

  const totalOwe = balances
    ?.filter((item) => item.amount > 0)
    .reduce((acc, expense) => {
      return acc + expense.amount;
    }, 0);

  const toPay = balances?.filter((item) => item.amount > 0);

  const settleWithList = toPay
    .map((item) => {
      const member = members.find((member) => member.id === item.firendId);

      if (!member) {
        return null;
      }

      return {
        balance: item,
        member: member,
      };
    })
    .filter((item) => item !== null);

  const handleSettleOne = async (settleWith: User) => {
    if (!address) {
      toast.error("Please connect your wallet to settle debts");
      return;
    }

    settleDebtMutation.mutate(
      {
        groupId,
        address,
        settleWithId: settleWith.id,
      },
      {
        onSuccess: () => {
          toast.success(`Successfully settled debt with ${settleWith.name}`);

          // refetch the specific group data
          queryClient.invalidateQueries({
            queryKey: [QueryKeys.GROUPS, groupId],
          });

          // refetch the general groups list and balances
          queryClient.invalidateQueries({ queryKey: [QueryKeys.GROUPS] });
          queryClient.invalidateQueries({ queryKey: [QueryKeys.BALANCES] });

          onClose();
        },
      }
    );
  };

  const handleSettleAll = async () => {
    if (!address) {
      toast.error("Please connect your wallet to settle debts");
      return;
    }

    settleDebtMutation.mutate(
      {
        groupId,
        address,
      },
      {
        onSuccess: () => {
          // refetch the specific group data
          queryClient.invalidateQueries({
            queryKey: [QueryKeys.GROUPS, groupId],
          });

          // refetch the general groups list and balances
          queryClient.invalidateQueries({ queryKey: [QueryKeys.GROUPS] });
          queryClient.invalidateQueries({ queryKey: [QueryKeys.BALANCES] });

          onClose();
          toast.success("Successfully settled all debts");
        },
      }
    );
  };

  const isPending = settleDebtMutation.isPending;

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

                {isConnected && address && (
                  <div className="text-body-sm text-white/50 mb-4">
                    Connected with {address?.slice(0, 25) + "..."}
                  </div>
                )}

                <div className="space-y-3">
                  <motion.button
                    onClick={() => {
                      if (!isConnected) {
                        connectWallet();
                      } else {
                        disconnectWallet();
                      }
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full h-[42px] rounded-[15px] bg-[#1F1F23] text-sm font-medium text-white hover:bg-[#2a2a2e] transition-colors border border-white flex items-center justify-center gap-2"
                  >
                    {isConnected && address
                      ? "Disconnect Wallet"
                      : "Connect Wallet"}
                  </motion.button>

                  <div className="relative">
                    <motion.button
                      whileHover={{ scale: isPending ? 1 : 1.02 }}
                      whileTap={{ scale: isPending ? 1 : 0.98 }}
                      className="w-full h-[42px] rounded-[15px] bg-[#1F1F23] text-sm font-medium text-white hover:bg-[#2a2a2e] transition-colors border border-white flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                      onClick={() => setShowDebtorsList(!showDebtorsList)}
                      disabled={isPending}
                    >
                      {isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Image
                          src={"/settleOne.svg"}
                          alt="Settle One"
                          width={20}
                          height={20}
                        />
                      )}
                      {isPending ? "Processing..." : "Settle with one"}
                      {!isPending && (
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            showDebtorsList ? "rotate-180" : ""
                          }`}
                        />
                      )}
                    </motion.button>

                    {/* Dropdown for selecting a person to settle with */}
                    {showDebtorsList && settleWithList.length > 0 && (
                      <div className="absolute top-full left-0 w-full mt-1 bg-[#1F1F23] rounded-[15px] border border-white/10 overflow-hidden z-10">
                        {settleWithList.map((debtor, index) => (
                          <button
                            key={debtor.member?.id}
                            className="w-full px-4 py-3 text-left text-white hover:bg-white/10 flex items-center justify-between border-b border-white/5 last:border-b-0"
                            onClick={() => handleSettleOne(debtor.member)}
                          >
                            <span>{debtor.member?.name}</span>
                            <span className="text-[#FF4444]">
                              ${debtor.balance.amount.toFixed(2)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {showDebtorsList && settleWithList.length === 0 && (
                      <div className="absolute top-full left-0 w-full mt-1 bg-[#1F1F23] rounded-[15px] border border-white/10 overflow-hidden z-10">
                        <div className="px-4 py-3 text-white/70 text-center">
                          No debts to settle
                        </div>
                      </div>
                    )}
                  </div>

                  <motion.button
                    whileHover={{ scale: isPending ? 1 : 1.02 }}
                    whileTap={{ scale: isPending ? 1 : 0.98 }}
                    className="w-full h-[50px] rounded-[15px] bg-[#1F1F23] text-body font-medium text-white hover:bg-[#2a2a2e] transition-colors border border-white flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    onClick={handleSettleAll}
                    disabled={isPending || totalOwe <= 0}
                  >
                    {isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Image
                        src={"/settleEveryone.svg"}
                        alt="Settle Everyone"
                        width={20}
                        height={20}
                      />
                    )}
                    {isPending ? "Processing..." : "Settle with everyone"}{" "}
                    {!isPending && (
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
