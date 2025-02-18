"use client";

import { useState } from "react";
import { TransactionList } from "@/components/transaction-list";
import { TransactionRequests } from "@/components/transaction-requests";
import { GroupsList } from "@/components/groups-list";
import { useWallet } from "@/hooks/useWallet";
import { useGroups } from "@/stores/groups";
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
        refetch, //refetch the session
    } = authClient.useSession();

    console.log(session);

    return (
        <div>
            <h1 className="text-display text-white capitalize inline-block mb-8">
                Overview
            </h1>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 relative z-0">
                <div className="lg:col-span-2 space-y-8">
                    <div>
                        <div className="mb-6 space-y-4">
                            <h2 className="text-display text-white mt-2 flex items-center justify-between">
                                <div>
                                    {netBalance < 0 ? (
                                        <>
                                            Overall, you owe{" "}
                                            <span className="text-[#FF4444]">
                                                $
                                                {Math.abs(netBalance).toFixed(
                                                    2
                                                )}
                                            </span>
                                        </>
                                    ) : netBalance > 0 ? (
                                        <>
                                            Overall, you are owed{" "}
                                            <span className="text-[#53e45d]">
                                                ${netBalance.toFixed(2)}
                                            </span>
                                        </>
                                    ) : (
                                        <>You're all settled up!</>
                                    )}
                                </div>
                                {/* <div className=""> */}
                                <button
                                    onClick={() => setIsSettleModalOpen(true)}
                                    className="group relative flex h-9 sm:h-10 items-center gap-2 rounded-full border border-white/10 bg-transparent px-3 sm:px-4 text-xs font-normal text-white/90 transition-all duration-300 hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                                >
                                    Settle Debts
                                </button>
                                {/* </div> */}
                            </h2>
                        </div>
                        <TransactionList transactions={transactions} />
                    </div>
                    <div className="relative z-10">
                        <GroupsList />
                    </div>
                </div>
                <div className="relative z-0">
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
