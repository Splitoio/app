"use client";

import { GroupInfoHeader } from "@/components/group-info-header";
import { useGroups } from "@/stores/groups";
import { useWallet } from "@/hooks/useWallet";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SettleDebtsModal } from "@/components/settle-debts-modal";

export default function GroupDetailsPage({
    params,
}: {
    params: { id: string };
}) {
    const { groups } = useGroups();
    const { address } = useWallet();
    const router = useRouter();
    const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
    const group = groups.find((g) => g.id === params.id);

    if (!group) return null;

    return (
        <div className="w-full space-y-8">
            <h1 className="text-display text-white capitalize inline-block mb-8">
                {" "}
                Groups
            </h1>
            <GroupInfoHeader
                groupId={params.id}
                onSettleClick={() => setIsSettleModalOpen(true)}
            />

            <div>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-h2 text-white">
                        Group Members ({group.members.length})
                    </h2>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-white/15 to-transparent mb-6" />

                <div className="grid grid-cols-1 gap-4">
                    <div className="grid grid-cols-4 gap-4 px-2 py-2 text-body-sm text-white/70">
                        <div>Member</div>
                        <div className="text-right">Owed</div>
                        <div className="text-right">Owe</div>
                        <div className="text-right">Status</div>
                    </div>

                    {group.members.map((member) => {
                        const memberDebts = group.debts.filter(
                            (debt) => debt.from === member || debt.to === member
                        );

                        // Calculate how much they owe others
                        const owe = memberDebts
                            .filter((debt) => debt.from === member)
                            .reduce((sum, debt) => sum + debt.amount, 0);

                        // Calculate how much they are owed
                        const owed = memberDebts
                            .filter((debt) => debt.to === member)
                            .reduce((sum, debt) => sum + debt.amount, 0);

                        return (
                            <div
                                key={member}
                                className="grid grid-cols-4 gap-4 items-center px-2 py-3"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 sm:h-10 sm:w-10 overflow-hidden rounded-full">
                                        <Image
                                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member}`}
                                            alt={member}
                                            width={40}
                                            height={40}
                                            className="h-full w-full"
                                        />
                                    </div>
                                    <span className="text-body font-medium text-white">
                                        {member.slice(0, 5)}...
                                        {member.slice(-2)}
                                    </span>
                                </div>
                                <div className="text-right text-[#FF4444]">
                                    ${owed.toFixed(2)}
                                </div>
                                <div className="text-right text-[#53e45d]">
                                    ${owe.toFixed(2)}
                                </div>
                                <div className="flex justify-end">
                                    {owed === 0 && owe === 0 ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#1F1F23]/50">
                                            <span className="text-body-sm text-[#53e45d]">
                                                Paid
                                            </span>
                                            <span className="text-caption text-white/50">
                                                via
                                            </span>
                                            <svg
                                                className="h-4 w-4"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg"
                                            >
                                                <path
                                                    d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                                                    fill="#FFC107"
                                                />
                                            </svg>
                                        </span>
                                    ) : (
                                        <span className="text-body-sm text-white/70">
                                            Pending
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div>
                <h2 className="text-h2 text-white mb-6">Group Activities</h2>
                <div className="h-px bg-gradient-to-r from-transparent via-white/15 to-transparent mb-6" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {group.debts.map((debt, index) => (
                        <div key={index} className="animate-border-light">
                            <div className="rounded-[24px] bg-[#262627] p-6 min-h-[160px]">
                                <div className="flex items-start gap-4">
                                    <Image
                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${debt.from}`}
                                        alt={debt.from}
                                        width={48}
                                        height={48}
                                        className="h-12 w-12 rounded-full"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-h3 text-white font-medium">
                                                {debt.from.slice(0, 5)}...
                                                {debt.from.slice(-2)}
                                            </h3>
                                            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#07091E]/50">
                                                <div className="h-1.5 w-1.5 rounded-full bg-[#FFC107]" />
                                                <span className="text-body-sm text-[#FFC107]">
                                                    Pending
                                                </span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-h3">
                                                {debt.from === address ? (
                                                    <>
                                                        <span className="text-[#FF4444] font-semibold">
                                                            you owe
                                                        </span>{" "}
                                                        <span className="text-[#FF4444] font-semibold">
                                                            ${debt.amount}
                                                        </span>
                                                    </>
                                                ) : debt.to === address ? (
                                                    <>
                                                        <span className="text-[#53e45d] font-semibold">
                                                            owes you
                                                        </span>{" "}
                                                        <span className="text-[#53e45d] font-semibold">
                                                            ${debt.amount}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="text-white/70 font-semibold">
                                                            owes
                                                        </span>{" "}
                                                        <span className="text-white/70 font-semibold">
                                                            ${debt.amount}
                                                        </span>
                                                    </>
                                                )}
                                            </p>
                                            <p className="text-body-sm text-white/50">
                                                Message status
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <SettleDebtsModal
                isOpen={isSettleModalOpen}
                onClose={() => setIsSettleModalOpen(false)}
            />
        </div>
    );
}
