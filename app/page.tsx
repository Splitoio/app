"use client";

import { useState } from "react";
import { TransactionList } from "@/components/transaction-list";
import { TransactionRequests } from "@/components/transaction-requests";
import { GroupsList } from "@/components/groups-list";
import { useWallet } from "@/hooks/useWallet";
import { SettleDebtsModal } from "@/components/settle-debts-modal";
import { useBalances } from "@/features/balances/hooks/use-balances";
import { useGetAllGroups } from "@/features/groups/hooks/use-create-group";
import {
  calculateBalances,
  getTransactionsFromGroups,
} from "@/utils/calculations";
import { authClient } from "@/lib/auth";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/constants";

export default function Page() {
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const { isConnected, address } = useWallet();
  const { data: groups, isLoading: isGroupsLoading } = useGetAllGroups();
  const { data: balanceData, isLoading: isBalanceLoading } = useBalances();
  const youOwe = balanceData?.youOwe || [];
  const youGet = balanceData?.youGet || [];

  console.log("balanceData", balanceData);
  const queryClient = useQueryClient();

  const transactions = groups ? getTransactionsFromGroups(groups, address) : [];

  const handleSettleClick = () => {
    setIsSettling(true);
    setIsSettleModalOpen(true);

    // Refetch data after settling debts
    setTimeout(() => {
      // Refetch balances and groups data
      queryClient.invalidateQueries({ queryKey: [QueryKeys.BALANCES] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.GROUPS] });

      setIsSettling(false);
    }, 500);
  };

  return (
    <div>
      <h1 className="text-display text-white capitalize inline-block mb-4 min-[1025px]:mb-8">
        Overview
      </h1>
      <div className="grid grid-cols-1 gap-4 min-[1025px]:gap-8 min-[1025px]:grid-cols-3 relative z-0">
        <div className="min-[1025px]:col-span-2 space-y-4 min-[1025px]:space-y-8">
          <div>
            <div className="mb-4 min-[1025px]:mb-6 space-y-4">
              <h2 className="text-display text-white mt-2 flex flex-col min-[1025px]:flex-row min-[1025px]:items-center min-[1025px]:justify-between gap-4">
                <div className="text-base min-[1025px]:text-xl">
                  {isBalanceLoading && (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading balance...
                    </div>
                  )}

                  {youOwe.length > 0 && (
                    <>
                      Overall, you owe{" "}
                      <span className="text-[#FF4444]">
                        {youOwe
                          .map((debt) => `${debt.amount} ${debt.currency}`)
                          .join(", ")}
                      </span>
                    </>
                  )}

                  {youGet.length > 0 && (
                    <div>
                      Overall, you are owed{" "}
                      <span className="text-[#53e45d]">
                        $
                        {youGet
                          .map((debt) => `${debt.amount} ${debt.currency}`)
                          .join(", ")}
                      </span>
                    </div>
                  )}

                  {youOwe.length === 0 && youGet.length === 0 && (
                    <>You're all settled up!</>
                  )}
                </div>
                <button
                  onClick={handleSettleClick}
                  disabled={isSettling || isBalanceLoading}
                  className="group relative flex h-10 sm:h-12 items-center gap-2 rounded-full border border-white/10 bg-transparent px-2 sm:px-4 text-sm sm:text-base font-normal text-white/90 transition-all duration-300 hover:border-white/30 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] justify-center -mt-3 disabled:opacity-70 disabled:cursor-not-allowed"
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
              </h2>
            </div>
            <TransactionList />
          </div>
          <div className="relative z-10">
            <GroupsList />
          </div>
        </div>
        <div className="relative z-0">
          <TransactionRequests />
        </div>
      </div>

      {/* <SettleDebtsModal
        isOpen={isSettleModalOpen}
        onClose={() => setIsSettleModalOpen(false)}
      /> */}
    </div>
  );
}
