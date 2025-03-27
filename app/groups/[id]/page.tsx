"use client";

import { GroupInfoHeader } from "@/components/group-info-header";
import { useWallet } from "@/hooks/useWallet";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SettleDebtsModal } from "@/components/settle-debts-modal";
import { AddMemberModal } from "@/components/add-member-modal";
import { useGetGroupById } from "@/features/groups/hooks/use-create-group";
import { AddExpenseModal } from "@/components/add-expense-modal";

import { useAuthStore } from "@/stores/authStore";
import { useGetExpenses } from "@/features/expenses/hooks/use-create-expense";
import { Loader2 } from "lucide-react";

export default function GroupDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const { user } = useAuthStore();
  const groupId = params.id;
  const { data: group, isLoading } = useGetGroupById(groupId);
  const { address } = useWallet();
  const router = useRouter();
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);

  // console.log("groupData", groupData)

  if (!group) return null;
  if (!user) return null;

  const expenses = group?.expenses;

  return (
    <div className="w-full space-y-8">
      <h1 className="text-display text-white capitalize inline-block mb-8">
        {" "}
        Groups
      </h1>
      <GroupInfoHeader
        groupId={params.id}
        onSettleClick={() => setIsSettleModalOpen(true)}
        onAddExpenseClick={() => setIsAddExpenseModalOpen(true)}
        group={group}
      />

      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-h2 text-white">
            Group Members ({group.groupUsers.length})
          </h2>

          <button
            onClick={() => {
              setIsAddingMember(true);
              setIsAddMemberModalOpen(true);
            }}
            disabled={isAddingMember}
            className="group relative flex h-10 sm:h-12 justify-center items-center gap-2 rounded-full border border-white/10 bg-transparent px-3 sm:px-4 text-base font-normal text-white/90 transition-all duration-300 hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isAddingMember ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Member"
            )}
          </button>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-white/15 to-transparent mb-6" />

        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-4 gap-4 px-2 py-2 text-body-sm text-white/70">
            <div>Member</div>
            <div className="text-right">Owed</div>
            <div className="text-right">Owe</div>
            <div className="text-right">Status</div>
          </div>

          {group.groupUsers.map((member) => {
            // const memberDebts = group.debts.filter(
            //     (debt) => debt.from === member || debt.to === member
            // );

            // // Calculate how much they owe others
            // const owe = memberDebts
            //     .filter((debt) => debt.from === member)
            //     .reduce((sum, debt) => sum + debt.amount, 0);

            // // Calculate how much they are owed
            // const owed = memberDebts
            //     .filter((debt) => debt.to === member)
            //     .reduce((sum, debt) => sum + debt.amount, 0);
            const balances = group?.groupBalances.filter(
              (balance) => balance.userId === member.user.id
            );
            const owedBalance = balances?.filter(
              (balance) => balance.amount > 0
            );
            const oweBalance = balances?.filter(
              (balance) => balance.amount < 0
            );
            const owed = Math.abs(
              owedBalance?.reduce((sum, balance) => sum + balance.amount, 0)
            );
            const owe = Math.abs(
              oweBalance?.reduce((sum, balance) => sum + balance.amount, 0)
            );

            return (
              <div
                key={member.user.id}
                className="grid grid-cols-4 gap-4 items-center px-2 py-3"
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 sm:h-10 shrink-0 sm:w-10 overflow-hidden rounded-full">
                    <Image
                      src={
                        member.user.image ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.user.id}`
                      }
                      alt={member.user.name || member.user.id}
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        console.error(
                          `Error loading image for user ${
                            member.user.name || member.user.id
                          }`
                        );
                        // @ts-expect-error - fallback to dicebear on error
                        e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.user.id}`;
                      }}
                    />
                  </div>
                  <span className="text-body font-medium text-white">
                    {member.user.id === user?.id ? "You" : member.user.name}
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
                      <span className="text-body-sm text-[#53e45d]">Paid</span>
                      <span className="text-caption text-white/50">via</span>
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
                    <span className="text-body-sm text-white/70">Pending</span>
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
          {expenses?.map((debt, index: number) => {
            const paidBy = group?.groupUsers.find(
              (user) => user.user.id === debt.paidBy
            )?.user;

            if (!paidBy) return null;
            return (
              <div key={index} className="animate-border-light">
                <div className="rounded-[24px] bg-[#262627] p-6 min-h-[160px]">
                  <div className="flex items-start gap-4">
                    <Image
                      src={
                        paidBy.image ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${paidBy.id}`
                      }
                      alt={paidBy.name!}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-full object-cover"
                      onError={(e) => {
                        console.error(
                          `Error loading image for user ${
                            paidBy.name || paidBy.id
                          }`
                        );
                        // @ts-expect-error - fallback to dicebear on error
                        e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${paidBy.id}`;
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-h3 text-white font-medium">
                          {paidBy?.name}
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
                          {paidBy.id === user?.id ? (
                            <>
                              <span className="text-[#FF4444] font-semibold">
                                you owe
                              </span>{" "}
                              <span className="text-[#FF4444] font-semibold">
                                ${debt.amount}
                              </span>
                            </>
                          ) : paidBy.id === user?.id ? (
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
                          {debt.name}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {expense?.map((debt: any, index: number) => (
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
                </div> */}
      </div>

      <SettleDebtsModal
        isOpen={isSettleModalOpen}
        onClose={() => setIsSettleModalOpen(false)}
        balances={group.groupBalances.filter(
          (balance) => balance.userId === user.id
        )}
        groupId={groupId}
        members={group.groupUsers.map((user) => user.user)}
      />

      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => {
          setIsAddMemberModalOpen(false);
          setIsAddingMember(false);
        }}
        groupId={groupId}
      />

      <AddExpenseModal
        isOpen={isAddExpenseModalOpen}
        onClose={() => setIsAddExpenseModalOpen(false)}
        members={group.groupUsers.map((user) => user.user)}
        groupId={groupId}
      />
    </div>
  );
}
