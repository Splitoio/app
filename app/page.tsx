"use client";

import { useState, useEffect, useMemo } from "react";
import { useWallet } from "@/hooks/useWallet";
import { SettleDebtsModal } from "@/components/settle-debts-modal";
import { FriendsBreakdownModal } from "@/components/friends-breakdown-modal";
import { AddFriendsModal } from "@/components/add-friends-modal";
import { useGetAllGroups } from "@/features/groups/hooks/use-create-group";
import { useAnalytics } from "@/features/analytics/hooks/use-analytics";
import { useReminders } from "@/features/reminders/hooks/use-reminders";
import { TransactionRequestList } from "@/components/transaction-request-list";
import Image from "next/image";
import { apiClient } from "@/api-helpers/client"; // <-- Use your apiClient here
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
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGetFriends } from "@/features/friends/hooks/use-get-friends";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";
import { useConvertedBalanceTotal } from "@/features/currencies/hooks/use-currencies";

/** Derive overall youOwe/youGet from groups' groupBalances (same source as group pages) */
function useOverallBalancesFromGroups(
  groups: { groupBalances?: { userId: string; currency: string; amount: number }[] }[],
  userId: string | null
) {
  return useMemo(() => {
    if (!userId || !groups?.length) return { youOwe: [] as { currency: string; amount: number }[], youGet: [] as { currency: string; amount: number }[] };
    const byCurrency: Record<string, number> = {};
    for (const group of groups) {
      const myBalances = (group.groupBalances ?? []).filter((b) => b.userId === userId);
      for (const b of myBalances) {
        byCurrency[b.currency] = (byCurrency[b.currency] ?? 0) + b.amount;
      }
    }
    const youOwe: { currency: string; amount: number }[] = [];
    const youGet: { currency: string; amount: number }[] = [];
    Object.entries(byCurrency).forEach(([currency, amount]) => {
      if (amount > 0) youOwe.push({ currency, amount });
      else if (amount < 0) youGet.push({ currency, amount: Math.abs(amount) });
    });
    return { youOwe, youGet };
  }, [groups, userId]);
}

/** Shows converted total(s) for owe/owed in default currency */
function DashboardConvertedBalance({
  oweItems,
  owedItems,
  defaultCurrency,
}: {
  oweItems: { amount: number; currency: string }[];
  owedItems: { amount: number; currency: string }[];
  defaultCurrency: string;
}) {
  const { total: totalOwe, isLoading: loadingOwe } = useConvertedBalanceTotal(oweItems, defaultCurrency);
  const { total: totalOwed, isLoading: loadingOwed } = useConvertedBalanceTotal(
    owedItems.map((i) => ({ amount: i.amount, currency: i.currency })),
    defaultCurrency
  );
  const loading = loadingOwe || loadingOwed;
  const hasOwe = oweItems.length > 0;
  const hasOwed = owedItems.length > 0;
  if (!hasOwe && !hasOwed) return <>Settled</>;
  if (loading) return <span className="text-white/60">…</span>;
  if (hasOwe && hasOwed) {
    return (
      <div>
        <div>You owe <span className="text-[#FF4444]">{formatCurrency(totalOwe, defaultCurrency)}</span></div>
        <div>Owes you <span className="text-[#53e45d]">{formatCurrency(totalOwed, defaultCurrency)}</span></div>
      </div>
    );
  }
  if (hasOwe) {
    return <>You owe <span className="text-[#FF4444]">{formatCurrency(totalOwe, defaultCurrency)}</span></>;
  }
  return <>Owes you <span className="text-[#53e45d]">{formatCurrency(totalOwed, defaultCurrency)}</span></>;
}

/** Group row: shows converted total for this group's balance for the given user */
function DashboardGroupBalance({
  group,
  userId,
  defaultCurrency,
}: {
  group: { id: string; name: string; groupBalances?: { userId: string; currency: string; amount: number }[] };
  userId: string | null;
  defaultCurrency: string;
}) {
  if (!userId || !group.groupBalances?.length) return <>No balance</>;
  const userBalances = group.groupBalances.filter((b) => b.userId === userId);
  const byCurrency = userBalances.reduce((acc, b) => {
    acc[b.currency] = (acc[b.currency] ?? 0) + b.amount;
    return acc;
  }, {} as Record<string, number>);
  const oweItems = Object.entries(byCurrency)
    .filter(([, amount]) => amount > 0)
    .map(([currency, amount]) => ({ amount, currency }));
  const owedItems = Object.entries(byCurrency)
    .filter(([, amount]) => amount < 0)
    .map(([currency, amount]) => ({ amount: Math.abs(amount), currency }));
  return (
    <DashboardConvertedBalance
      oweItems={oweItems}
      owedItems={owedItems}
      defaultCurrency={defaultCurrency}
    />
  );
}

/** Per-friend balances from groups' groupBalances (matches group expense page) */
function useFriendBalancesFromGroups(
  groups: { groupBalances?: { userId: string; firendId: string; currency: string; amount: number }[] }[],
  friends: { id: string }[],
  userId: string | null
) {
  return useMemo(() => {
    if (!userId || !groups?.length) return {} as Record<string, { currency: string; amount: number }[]>;
    const byFriend: Record<string, Record<string, number>> = {};
    for (const group of groups) {
      const balances = (group.groupBalances ?? []) as { userId: string; firendId: string; currency: string; amount: number }[];
      for (const b of balances) {
        if (b.userId !== userId) continue;
        const friendId = b.firendId;
        if (!byFriend[friendId]) byFriend[friendId] = {};
        byFriend[friendId][b.currency] = (byFriend[friendId][b.currency] ?? 0) + b.amount;
      }
    }
    const result: Record<string, { currency: string; amount: number }[]> = {};
    for (const friend of friends) {
      const curr = byFriend[friend.id];
      if (!curr) {
        result[friend.id] = [];
        continue;
      }
      const list: { currency: string; amount: number }[] = [];
      Object.entries(curr).forEach(([currency, amount]) => {
        if (amount !== 0) list.push({ currency, amount });
      });
      result[friend.id] = list;
    }
    return result;
  }, [groups, friends, userId]);
}

export default function Page() {
  const router = useRouter();
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [isFriendsBreakdownModalOpen, setIsFriendsBreakdownModalOpen] = useState(false);
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [settleFriendId, setSettleFriendId] = useState<string | null>(null);
  const [settleFriendGroupId, setSettleFriendGroupId] = useState<string | null>(null);
  const [isSettling, setIsSettling] = useState(false);
  const { isConnected, address } = useWallet();
  const { data: groups = [], isLoading: isGroupsLoading } = useGetAllGroups();
  const { data: friends = [], isLoading: isFriendsLoading } = useGetFriends();
  const { data: analyticsData, isLoading: isAnalyticsLoading, error: analyticsError } = useAnalytics();
  const {
    reminders,
    isLoading: isRemindersLoading,
    acceptReminder,
    rejectReminder,
    isAccepting,
    isRejecting,
    sendReminder,
    isSending
  } = useReminders();
  const { user } = useAuthStore();
  const defaultCurrency = user?.currency || "USD";
  const { youOwe, youGet } = useOverallBalancesFromGroups(groups, user?.id ?? null);
  const friendBalancesFromGroups = useFriendBalancesFromGroups(groups, friends, user?.id ?? null);
  const { total: overallOweTotal, isLoading: overallOweLoading } = useConvertedBalanceTotal(youOwe, defaultCurrency);
  const { total: overallGetTotal, isLoading: overallGetLoading } = useConvertedBalanceTotal(youGet, defaultCurrency);
  const owedThisMonth = Number(analyticsData?.owed) || 0;
  const lentThisMonth = Number(analyticsData?.lent) || 0;
  const settledThisMonth = Number(analyticsData?.settled) || 0;
  const { total: owedConverted, isLoading: owedConvLoading } = useConvertedBalanceTotal(
    owedThisMonth ? [{ amount: owedThisMonth, currency: "USD" }] : [],
    defaultCurrency
  );
  const { total: lentConverted, isLoading: lentConvLoading } = useConvertedBalanceTotal(
    lentThisMonth ? [{ amount: lentThisMonth, currency: "USD" }] : [],
    defaultCurrency
  );
  const { total: settledConverted, isLoading: settledConvLoading } = useConvertedBalanceTotal(
    settledThisMonth ? [{ amount: settledThisMonth, currency: "USD" }] : [],
    defaultCurrency
  );
  const queryClient = useQueryClient();

  // Add debug logging
  useEffect(() => {
    if (analyticsData) {
      console.log("Analytics data in component:", analyticsData);
    }
    if (analyticsError) {
      console.error("Analytics error in component:", analyticsError);
      // Log the full error object for debugging
      console.error("Full error object:", {
        name: analyticsError.name,
        message: analyticsError.message,
        stack: analyticsError.stack,
        cause: analyticsError.cause
      });
    }
  }, [analyticsData, analyticsError]);

  const handleSettleAllClick = () => {
    setSettleFriendId(null);
    setIsSettling(true);
    setIsSettleModalOpen(true);

    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.BALANCES] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.GROUPS] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.ANALYTICS] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.FRIENDS] });
      setIsSettling(false);
    }, 500);
  };

  const handleSettleFriendClick = (friendId: string) => {
    // Open the friends breakdown modal first
    setIsFriendsBreakdownModalOpen(true);
  };

  return (
    <div className="w-full">
      {/* Header integrated into the dashboard */}
      <div className="py-4 sm:py-6 mb-4 sm:mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-mobile-base sm:text-xl text-white max-w-[60%]">
            {isGroupsLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading balance...
              </div>
            ) : youOwe.length > 0 ? (
              <div>
                Overall, you owe{" "}
                <span className="font-inter font-semibold text-[24px] leading-[100%] tracking-[-0.04em] text-[#FF4444]">
                  {overallOweLoading ? "…" : formatCurrency(overallOweTotal, defaultCurrency)}
                </span>
                {youOwe.length > 1 && !overallOweLoading && (
                  <span className="block text-mobile-sm text-white/60 mt-0.5">
                    ({youOwe.map((d) => formatCurrency(d.amount, d.currency)).join(", ")})
                  </span>
                )}
              </div>
            ) : youGet.length > 0 ? (
              <div>
                Overall, you are owed{" "}
                <span className="font-inter font-semibold text-[24px] leading-[100%] tracking-[-0.04em] text-[#53e45d]">
                  {overallGetLoading ? "…" : formatCurrency(overallGetTotal, defaultCurrency)}
                </span>
                {youGet.length > 1 && !overallGetLoading && (
                  <span className="block text-mobile-sm text-white/60 mt-0.5">
                    ({youGet.map((d) => formatCurrency(d.amount, d.currency)).join(", ")})
                  </span>
                )}
              </div>
            ) : (
              <div>You're all settled up!</div>
            )}
          </h2>
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Settle all debt button - commented out */}
            {/* <button
              onClick={handleSettleAllClick}
              disabled={isSettling || isGroupsLoading}
              className="group relative flex h-10 sm:h-12 items-center justify-center gap-1 sm:gap-2 rounded-full border border-white/10 bg-white px-4 sm:px-6 text-mobile-sm sm:text-base font-medium text-black transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSettling ? (
                <>
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                  <span className="truncate">Settling...</span>
                </>
              ) : (
                <>
                  <Image
                    src="/coins-dollar.svg"
                    alt="Settle"
                    width={22}
                    height={22}
                    className="invert h-4 w-4 sm:h-5 sm:w-5"
                  />
                  <span className="truncate">Settle all debts</span>
                </>
              )}
            </button> */}
            <Link href="/settings" className="cursor-pointer">
              <div className="h-10 w-10 sm:h-14 sm:w-14 overflow-hidden rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-0.5 hover:opacity-80 transition-opacity">
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
                      src={`https://api.dicebear.com/9.x/identicon/svg?seed=${user?.id || user?.email || "user"}`}
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
            </Link>
          </div>
        </div>
      </div>

      {/* Monthly Stats - Three blocks side by side */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div className="rounded-3xl bg-[#101012] p-8">
          <div className="flex items-center mb-4">
            <span className="text-white/60 text-xl">You owed this month</span>
          </div>
          <p className="font-inter font-semibold text-[24px] leading-[100%] tracking-[-0.04em] text-white">
            {isAnalyticsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-white/50" />
            ) : analyticsError ? (
              <button 
                onClick={() => queryClient.invalidateQueries({ queryKey: [QueryKeys.ANALYTICS] })}
                className="text-red-500 text-base font-normal hover:underline flex items-center gap-2"
              >
                <span>Error loading data</span>
                <span className="text-sm">(click to retry)</span>
              </button>
            ) : owedConvLoading ? (
              "…"
            ) : (
              formatCurrency(owedConverted, defaultCurrency)
            )}
          </p>
        </div>

        <div className="rounded-3xl bg-[#101012] p-8">
          <div className="flex items-center mb-4">
            <span className="text-white/60 text-xl">You lent this month</span>
          </div>
          <p className="font-inter font-semibold text-[24px] leading-[100%] tracking-[-0.04em] text-white">
            {isAnalyticsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-white/50" />
            ) : analyticsError ? (
              <button 
                onClick={() => queryClient.invalidateQueries({ queryKey: [QueryKeys.ANALYTICS] })}
                className="text-red-500 text-base font-normal hover:underline flex items-center gap-2"
              >
                <span>Error loading data</span>
                <span className="text-sm">(click to retry)</span>
              </button>
            ) : lentConvLoading ? (
              "…"
            ) : (
              formatCurrency(lentConverted, defaultCurrency)
            )}
          </p>
        </div>

        <div className="rounded-3xl bg-[#101012] p-8">
          <div className="flex items-center mb-4">
            <span className="text-white/60 text-xl">You settled this month</span>
          </div>
          <p className="font-inter font-semibold text-[24px] leading-[100%] tracking-[-0.04em] text-white">
            {isAnalyticsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-white/50" />
            ) : analyticsError ? (
              <button 
                onClick={() => queryClient.invalidateQueries({ queryKey: [QueryKeys.ANALYTICS] })}
                className="text-red-500 text-base font-normal hover:underline flex items-center gap-2"
              >
                <span>Error loading data</span>
                <span className="text-sm">(click to retry)</span>
              </button>
            ) : settledConvLoading ? (
              "…"
            ) : (
              formatCurrency(settledConverted, defaultCurrency)
            )}
          </p>
        </div>
      </div>

      {/* Transaction Requests and Groups/Friends section */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-4 sm:gap-6">
        {/* Friends and Groups section */}
        <div className="space-y-4 sm:space-y-6">
        {/* Friends block (wider) */}
        <div className="lg:col-span-2 rounded-2xl sm:rounded-3xl bg-[#101012] p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-semibold text-white">
              Your Friends
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/groups')}
                className="flex items-center gap-1 sm:gap-2 text-white/60 hover:text-white transition-colors"
              >
                <Image
                  src="/coins-dollar.svg"
                  alt="Manage Debts"
                  width={20}
                  height={20}
                  className="opacity-90 h-4 w-4 sm:h-5 sm:w-5"
                />
                <span className="font-medium text-mobile-sm sm:text-base">
                  Manage Debts
                </span>
              </button>
              <button
                onClick={() => setIsAddFriendModalOpen(true)}
                className="flex items-center gap-1 sm:gap-2 text-white/60 hover:text-white transition-colors"
              >
                <Image
                  src="/plus-sign-circle.svg"
                  alt="Add"
                  width={20}
                  height={20}
                  className="opacity-90 h-4 w-4 sm:h-5 sm:w-5"
                />
                <span className="font-medium text-mobile-sm sm:text-base">
                  Add Friends
                </span>
              </button>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-8">
            {isFriendsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-white/50" />
                <span className="ml-2 text-white/70 text-mobile-sm sm:text-base">
                  Loading friends...
                </span>
              </div>
            ) : friends && friends.length > 0 ? (
              friends.map((friend) => {
                // Use balances from groups (same source as group expense page)
                const balances = friendBalancesFromGroups[friend.id] ?? [];
                const oweBalances: Record<string, number> = {};
                const owedBalances: Record<string, number> = {};

                balances.forEach((b) => {
                  if (b.amount > 0) {
                    oweBalances[b.currency] = (oweBalances[b.currency] ?? 0) + b.amount;
                  } else if (b.amount < 0) {
                    owedBalances[b.currency] = (owedBalances[b.currency] ?? 0) + Math.abs(b.amount);
                  }
                });

                const oweItems = Object.entries(oweBalances).map(([currency, amount]) => ({ amount, currency }));
                const owedItems = Object.entries(owedBalances).map(([currency, amount]) => ({ amount, currency }));
                const hasOwedBalances = owedItems.length > 0;
                const hasOweBalances = oweItems.length > 0;

                return (
                  <div
                    key={friend.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="h-10 w-10 sm:h-14 sm:w-14 overflow-hidden rounded-full">
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
                        <p className="text-mobile-base sm:text-xl text-white font-medium">
                          {friend.name}
                        </p>
                        <div className="text-mobile-sm sm:text-base text-white/60">
                          <DashboardConvertedBalance
                            oweItems={oweItems}
                            owedItems={owedItems}
                            defaultCurrency={defaultCurrency}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Show appropriate button based on debt direction */}
                    {hasOwedBalances && (
                      <button
                        className="w-full sm:w-56 group relative flex h-10 sm:h-12 items-center justify-center gap-1 sm:gap-2 rounded-full border-2 border-white/80 bg-transparent px-4 sm:px-5 text-mobile-sm sm:text-base font-medium text-white transition-all duration-300 hover:border-white/40 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                        onClick={() => sendReminder({
                          receiverId: friend.id,
                          reminderType: "USER",
                          content: "Please settle your balance."
                        })}
                        disabled={isSending}
                      >
                        <Image
                          src="/clock-03.svg"
                          alt="Reminder"
                          width={20}
                          height={20}
                          className="opacity-90 h-4 w-4 sm:h-5 sm:w-5"
                        />
                        <span>{isSending ? "Sending..." : "Notify"}</span>
                      </button>
                    )}

                    {/* Individual settle debt button - commented out, replaced with single Manage Debts button */}
                    {/* {hasPositiveBalance && (
                      <button
                        className="w-full sm:w-56 group relative flex h-10 sm:h-12 items-center justify-center gap-1 sm:gap-2 rounded-full border-2 border-white/80 bg-transparent px-4 sm:px-5 text-mobile-sm sm:text-base font-medium text-white transition-all duration-300 hover:border-white/40 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                        onClick={() => handleSettleFriendClick(friend.id)}
                      >
                        <Image
                          src="/coins-dollar.svg"
                          alt="Settle"
                          width={20}
                          height={20}
                          className="opacity-90 h-4 w-4 sm:h-5 sm:w-5"
                        />
                        <span>Settle Debts</span>
                      </button>
                    )} */}
                  </div>
                );
              })
            ) : (
              <div className="text-white/70 text-center py-6 sm:py-8 text-mobile-sm sm:text-base">
                No friends added yet. Add some friends to get started!
              </div>
            )}
          </div>
        </div>

        {/* Groups block */}
        <div className="rounded-2xl sm:rounded-3xl bg-[#101012] p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-semibold text-white">
              Your Groups
            </h2>
            <Link
              href="/groups"
              className="text-white font-medium flex items-center gap-1 sm:gap-2 rounded-full border border-white/80 px-3 sm:px-4 py-1.5 sm:py-2 hover:bg-white/[0.03] transition-colors text-mobile-sm sm:text-base"
            >
              <Users2 className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>View All</span>
            </Link>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {isGroupsLoading ? (
              <div className="flex items-center justify-center p-6 sm:p-8">
                <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-white/50" />
                <span className="ml-2 text-white/70 text-mobile-sm sm:text-base">
                  Loading groups...
                </span>
              </div>
            ) : groups && groups.length > 0 ? (
              groups.slice(0, 4).map((group) => (
                <Link href={`/groups/${group.id}`} key={group.id}>
                  <div className="flex items-center justify-between hover:bg-white/[0.02] p-2 sm:p-3 rounded-lg transition-colors">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="h-10 w-10 sm:h-14 sm:w-14 overflow-hidden rounded-xl bg-white/[0.03]">
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
                        <p className="text-mobile-base sm:text-xl text-white font-medium">
                          {group.name}
                        </p>
                        <p className="text-mobile-sm sm:text-base text-white/60">
                          <DashboardGroupBalance
                            group={group}
                            userId={user?.id ?? null}
                            defaultCurrency={defaultCurrency}
                          />
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-white/70 text-center py-6 sm:py-8 text-mobile-sm sm:text-base">
                No groups created yet. Create a group to get started!
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Transaction Requests */}
        <div className="rounded-2xl sm:rounded-3xl bg-[#101012] p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl text-white font-medium">Transaction Requests</h2>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: [QueryKeys.REMINDERS] })}
              className="p-2 rounded-full hover:bg-white/5 transition-colors"
            >
              <Bell className="h-5 w-5 text-white/70" />
            </button>
          </div>

          {isRemindersLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-white/50" />
            </div>
          ) : (
            <TransactionRequestList
              reminders={reminders || []}
              onAccept={(reminderId) => {
                acceptReminder(reminderId);
              }}
              onReject={(reminderId) => {
                rejectReminder(reminderId);
              }}
              isAccepting={isAccepting}
              isRejecting={isRejecting}
            />
          )}
        </div>
      </div>

      <SettleDebtsModal
        isOpen={isSettleModalOpen}
        onClose={() => setIsSettleModalOpen(false)}
        showIndividualView={settleFriendId !== null}
        selectedFriendId={settleFriendId}
        groupId={settleFriendId ? settleFriendGroupId || "" : (groups && groups[0]?.id) || ""}
      />

      <FriendsBreakdownModal
        isOpen={isFriendsBreakdownModalOpen}
        onClose={() => setIsFriendsBreakdownModalOpen(false)}
        onSettleAll={() => {
          setIsFriendsBreakdownModalOpen(false);
          handleSettleAllClick();
        }}
      />

      <AddFriendsModal
        isOpen={isAddFriendModalOpen}
        onClose={() => setIsAddFriendModalOpen(false)}
      />
    </div>
  );
}
