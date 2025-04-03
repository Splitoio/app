"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { SettleDebtsModal } from "@/components/settle-debts-modal";
import { useBalances } from "@/features/balances/hooks/use-balances";
import { useGetAllGroups } from "@/features/groups/hooks/use-create-group";
import {
  calculateBalances,
  getTransactionsFromGroups,
} from "@/utils/calculations";
import Image from "next/image";
import {
  Loader2,
  Users2,
  Bell,
  Send,
  User,
  CreditCard,
  DollarSign,
  Settings,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/constants";
import { Header } from "@/components/header";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";
import { useGetFriends } from "@/features/friends/hooks/use-get-friends";

export default function Page() {
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settleFriendId, setSettleFriendId] = useState<string | null>(null);
  const [isSettling, setIsSettling] = useState(false);
  const { isConnected, address } = useWallet();
  const { data: groups, isLoading: isGroupsLoading } = useGetAllGroups();
  const { data: balanceData, isLoading: isBalanceLoading } = useBalances();
  const { data: friends, isLoading: isFriendsLoading } = useGetFriends();
  const { user } = useAuthStore();
  const youOwe = balanceData?.youOwe || [];
  const youGet = balanceData?.youGet || [];
  const queryClient = useQueryClient();

  // Mock data for the monthly stats
  const monthlyStats = {
    owed: "$500.00 USD",
    lent: "$650.50 USD",
    settled: "$100.29 USD",
  };

  const handleSettleAllClick = () => {
    setSettleFriendId(null); // Clear any selected friend
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

  const handleSettleFriendClick = (friendId: string) => {
    setSettleFriendId(friendId);
    setIsSettleModalOpen(true);
  };

  return (
    <div className="w-full">
      {/* Header integrated into the dashboard */}
      <div className="py-6 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl text-white">
            {isBalanceLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading balance...
              </div>
            ) : youOwe.length > 0 ? (
              <div>
                Overall, you owe{" "}
                <span className="text-[#FF4444]">
                  {youOwe.map((debt) => `$${debt.amount}`).join(", ")}
                </span>
              </div>
            ) : (
              <div>You're all settled up!</div>
            )}
          </h2>
          <div className="flex items-center gap-4">
            <button
              onClick={handleSettleAllClick}
              disabled={isSettling || isBalanceLoading}
              className="group relative flex h-12 items-center justify-center gap-2 rounded-full border border-white/10 bg-white px-6 text-base font-medium text-black transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSettling ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Settling...
                </>
              ) : (
                <>
                  <Image
                    src="/coins-dollar.svg"
                    alt="Settle"
                    width={22}
                    height={22}
                    className="invert"
                  />
                  <span>Settle all debts</span>
                </>
              )}
            </button>
            <div className="h-14 w-14 overflow-hidden rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-0.5">
              <div className="h-full w-full rounded-full overflow-hidden bg-[#101012]">
                {user?.image ? (
                  <Image
                    src={user.image}
                    alt="Profile"
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Image
                    src={`https://api.dicebear.com/9.x/identicon/svg?seed=${
                      user?.id || user?.email || "user"
                    }`}
                    alt="Profile"
                    width={56}
                    height={56}
                    className="h-full w-full"
                    onError={(e) => {
                      console.error(`Error loading identicon for user`);
                      const target = e.target as HTMLImageElement;
                      target.src = `https://api.dicebear.com/9.x/identicon/svg?seed=user`;
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Stats - Three blocks side by side */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="rounded-3xl bg-[#101012] p-8">
          <div className="flex items-center mb-4">
            <span className="text-white/60 text-xl">You owed this month</span>
          </div>
          <p className="text-4xl font-semibold text-white">
            {monthlyStats.owed}
          </p>
        </div>

        <div className="rounded-3xl bg-[#101012] p-8">
          <div className="flex items-center mb-4">
            <span className="text-white/60 text-xl">You lent this month</span>
          </div>
          <p className="text-4xl font-semibold text-white">
            {monthlyStats.lent}
          </p>
        </div>

        <div className="rounded-3xl bg-[#101012] p-8">
          <div className="flex items-center mb-4">
            <span className="text-white/60 text-xl">
              You settled this month
            </span>
          </div>
          <p className="text-4xl font-semibold text-white">
            {monthlyStats.settled}
          </p>
        </div>
      </div>

      {/* Friends and Groups - Two blocks side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Friends block (wider) */}
        <div className="lg:col-span-2 rounded-3xl bg-[#101012] p-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-semibold text-white">Your Friends</h2>
            <button className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
              <Image
                src="/plus-sign-circle.svg"
                alt="Add"
                width={20}
                height={20}
                className="opacity-90"
              />
              <span className="font-medium">Add Friends</span>
            </button>
          </div>

          <div className="space-y-8">
            {isFriendsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-white/50" />
                <span className="ml-2 text-white/70">Loading friends...</span>
              </div>
            ) : friends && friends.length > 0 ? (
              friends.map((friend) => {
                // Find if there's a balance with this friend
                const hasPositiveBalance = friend.balances.some(
                  (balance) => balance.amount > 0
                );
                const hasNegativeBalance = friend.balances.some(
                  (balance) => balance.amount < 0
                );
                const friendBalance = friend.balances[0]; // Just use the first balance for now

                return (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 overflow-hidden rounded-full">
                        <Image
                          src={
                            friend.image ||
                            `https://api.dicebear.com/9.x/identicon/svg?seed=${friend.id}`
                          }
                          alt={friend.name}
                          width={56}
                          height={56}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            console.error(
                              `Error loading image for friend ${friend.id}`
                            );
                            const target = e.target as HTMLImageElement;
                            target.src = `https://api.dicebear.com/9.x/identicon/svg?seed=${friend.id}`;
                          }}
                        />
                      </div>
                      <div>
                        <p className="text-xl text-white font-medium">
                          {friend.name}
                        </p>
                        {friendBalance ? (
                          <p className="text-base text-white/60">
                            {friendBalance.amount > 0 ? (
                              <>
                                Owes you{" "}
                                <span className="text-[#53e45d]">
                                  ${Math.abs(friendBalance.amount).toFixed(2)}
                                </span>
                              </>
                            ) : friendBalance.amount < 0 ? (
                              <>
                                You owe{" "}
                                <span className="text-[#FF4444]">
                                  ${Math.abs(friendBalance.amount).toFixed(2)}
                                </span>
                              </>
                            ) : (
                              "All settled up"
                            )}
                          </p>
                        ) : (
                          <p className="text-base text-white/60">
                            No transactions yet
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Show appropriate button based on debt direction */}
                    {hasPositiveBalance && (
                      <button className="w-56 group relative flex h-12 items-center justify-center gap-2 rounded-full border-2 border-white/80 bg-transparent px-5 text-base font-medium text-white transition-all duration-300 hover:border-white/40 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                        <Image
                          src="/clock-03.svg"
                          alt="Reminder"
                          width={20}
                          height={20}
                          className="opacity-90"
                        />
                        <span>Send a Reminder</span>
                      </button>
                    )}

                    {hasNegativeBalance && (
                      <button
                        className="w-56 group relative flex h-12 items-center justify-center gap-2 rounded-full border-2 border-white/80 bg-transparent px-5 text-base font-medium text-white transition-all duration-300 hover:border-white/40 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                        onClick={() => handleSettleFriendClick(friend.id)}
                      >
                        <Image
                          src="/coins-dollar.svg"
                          alt="Settle"
                          width={20}
                          height={20}
                          className="opacity-90"
                        />
                        <span>Settle Debts</span>
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-white/70 text-center py-8">
                No friends added yet. Add some friends to get started!
              </div>
            )}
          </div>
        </div>

        {/* Groups block */}
        <div className="rounded-3xl bg-[#101012] p-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-semibold text-white">Your Groups</h2>
            <Link
              href="/groups"
              className="text-white font-medium flex items-center gap-2 rounded-full border border-white/80 px-4 py-2 hover:bg-white/[0.03] transition-colors"
            >
              <Users2 className="h-5 w-5" />
              <span>View All</span>
            </Link>
          </div>

          <div className="space-y-6">
            {isGroupsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-white/50" />
                <span className="ml-2 text-white/70">Loading groups...</span>
              </div>
            ) : groups && groups.length > 0 ? (
              groups.slice(0, 4).map((group) => (
                <Link href={`/groups/${group.id}`} key={group.id}>
                  <div className="flex items-center justify-between hover:bg-white/[0.02] p-3 rounded-lg transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 overflow-hidden rounded-xl bg-white/[0.03]">
                        {group.image ? (
                          <Image
                            src={group.image}
                            alt={group.name}
                            width={56}
                            height={56}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Image
                            src={`https://api.dicebear.com/9.x/identicon/svg?seed=${group.id}`}
                            alt={group.name}
                            width={56}
                            height={56}
                            className="h-full w-full"
                          />
                        )}
                      </div>
                      <div>
                        <p className="text-xl text-white font-medium">
                          {group.name}
                        </p>
                        <p className="text-base text-white/60">
                          {/* We'll need to calculate the actual balances here */}
                          {/* For now just display default text */}
                          View group details
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-white/70 text-center py-8">
                No groups created yet. Create a group to get started!
              </div>
            )}
          </div>
        </div>
      </div>

      <SettleDebtsModal
        isOpen={isSettleModalOpen}
        onClose={() => setIsSettleModalOpen(false)}
        showIndividualView={settleFriendId !== null}
        selectedFriendId={settleFriendId}
      />
    </div>
  );
}
