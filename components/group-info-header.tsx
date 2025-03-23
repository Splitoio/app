"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useWallet } from "@/hooks/useWallet";
import { DetailGroup } from "@/features/groups/api/client";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/constants";

export function GroupInfoHeader({
  groupId,
  onSettleClick,
  group,
  onAddExpenseClick,
}: {
  groupId: string;
  onSettleClick: () => void;
  group: DetailGroup;
  onAddExpenseClick: () => void;
}) {
  const router = useRouter();
  const { address } = useWallet();
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const queryClient = useQueryClient();

  if (!group) return null;

  // const getMyDebtInfo = () => {
  //   if (!address) return { amount: 0, type: "none" };

  //   // If I'm the payer, find how much others owe me
  //   if (group.paidBy === address) {
  //     const othersOweMe = group.debts.reduce(
  //       (sum, debt) => sum + debt.amount,
  //       0
  //     );
  //     return { amount: othersOweMe, type: "owed" };
  //   }

  //   // If someone else paid, find how much I owe them
  //   const myDebt = group.debts.find((debt) => debt.from === address);
  //   return {
  //     amount: myDebt?.amount || 0,
  //     type: "owe",
  //   };
  // };

  // const debtInfo = getMyDebtInfo();
  const debtInfo = {
    amount: 100,
    type: "owed",
  };

  const handleAddExpenseClick = () => {
    setIsAddingExpense(true);
    onAddExpenseClick();
    // Reset state after a delay to handle animation
    setTimeout(() => setIsAddingExpense(false), 500);
  };

  const handleSettleClick = () => {
    setIsSettling(true);
    onSettleClick();

    // Refetch data after settling debts
    setTimeout(() => {
      // refetch the specific group data
      queryClient.invalidateQueries({ queryKey: [QueryKeys.GROUPS, groupId] });

      // refetch the general groups list and balances
      queryClient.invalidateQueries({ queryKey: [QueryKeys.GROUPS] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.BALANCES] });

      setIsSettling(false);
    }, 500);
  };

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-6">
          <div className="h-32 w-32 overflow-hidden rounded-full">
            <Image
              src={group.image || "/group_icon_placeholder.svg"}
              alt={group.name}
              width={1000}
              height={1000}
              quality={100}
              priority={true}
              className="h-full w-auto object-cover"
            />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-h1 text-white">{group.name}</h1>
            <div className="inline-flex items-center rounded-xl bg-[#1F1F23]/50 px-3 py-1">
              <span className="text-body text-white/70">
                {debtInfo.type === "owed" ? "You are owed" : "You owe"}{" "}
                <span
                  className={
                    debtInfo.type === "owed"
                      ? "text-[#53e45d]"
                      : "text-[#FF4444]"
                  }
                >
                  ${debtInfo.amount.toFixed(2)}
                </span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 -mt-2">
          <button
            onClick={handleAddExpenseClick}
            disabled={isAddingExpense}
            className="group relative flex h-10 sm:h-12 justify-center items-center gap-2 rounded-full border border-white/10 bg-transparent px-3 sm:px-4 text-base font-normal text-white/90 transition-all duration-300 hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isAddingExpense ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Image
                  src={"/addExpenseIcon.svg"}
                  alt="Add"
                  width={20}
                  height={20}
                />
                Add Expense
              </>
            )}
          </button>
          <button
            onClick={handleSettleClick}
            disabled={isSettling}
            className="group relative flex h-10 sm:h-12 justify-center items-center gap-2 rounded-full border border-white/10 bg-transparent px-3 sm:px-4 !pl-1 text-base font-normal text-white/90 transition-all duration-300 hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSettling ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Settling...
              </>
            ) : (
              <>
                <Image
                  src={"/moneySend.svg"}
                  alt="Settle"
                  width={20}
                  height={20}
                />
                Settle Debts
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
