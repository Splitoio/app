"use client";

import { useState } from "react";
import { TransactionList } from "@/components/transaction-list";
import { TransactionRequests } from "@/components/transaction-requests";
import { GroupsList } from "@/components/groups-list";
import { useWallet } from "@/hooks/useWallet";
import { useGroups } from "@/stores/groups";
import { PageTitle } from "@/components/page-title";
import { SettleDebtsModal } from "@/components/settle-debts-modal";
import {
  calculateBalances,
  getTransactionsFromGroups,
} from "@/utils/calculations";
import { authClient } from "@/lib/auth";



export default function Page() {
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const { isConnected, address } = useWallet();
  const { groups } = useGroups();

  const { totalOwed, totalOwe, netBalance } = calculateBalances(
    groups,
    address
  );
  const transactions = getTransactionsFromGroups(groups, address);

  const { 
    data: session, 
    isPending, //loading state
    error, //error object
    refetch //refetch the session
  } = authClient.useSession();

  console.log(session);

  return (
    <div>
      <PageTitle />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <div>
            <div className="mb-6 space-y-4">
              <h2 className="text-display text-white mt-12 flex items-center justify-between">
                <div>
                  {netBalance < 0 ? (
                    <>
                      Overall, you owe{" "}
                      <span className="text-[#FF4444]">
                        ${Math.abs(netBalance).toFixed(2)}
                      </span>
                    </>
                  ) : netBalance > 0 ? (
                    <>
                      Overall, you are owed{" "}
                      <span className="text-[#67B76C]">
                        ${netBalance.toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <>You're all settled up!</>
                  )}
                </div>
                <div className="animate-border-light w-[155px]">
                  <button
                    onClick={() => setIsSettleModalOpen(true)}
                    className="w-full h-[40px] rounded-[15px] bg-[#000000] bg-opacity-80 text-body-sm font-medium text-white hover:bg-[#383838] transition-colors"
                  >
                    Settle Debts
                  </button>
                </div>
              </h2>
            </div>
            <TransactionList transactions={transactions} />
          </div>
          <GroupsList />
        </div>
        <div>
          <TransactionRequests />
        </div>
      </div>

      <SettleDebtsModal
        isOpen={isSettleModalOpen}
        onClose={() => setIsSettleModalOpen(false)}
      />
    </div>
  );
}
