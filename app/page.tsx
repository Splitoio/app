"use client";

import { useState, useEffect, useMemo } from "react";
import { useWallet } from "@/hooks/useWallet";
import { SettleDebtsModal } from "@/components/settle-debts-modal";
import { FriendsBreakdownModal } from "@/components/friends-breakdown-modal";
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
import { useQueryClient, useQueries } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/constants";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { useRouter } from "next/navigation";
import { useGetFriends } from "@/features/friends/hooks/use-get-friends";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";
import { formatRelativeTime } from "@/lib/utils";
import { useConvertedBalanceTotal, CURRENCY_QUERY_KEYS } from "@/features/currencies/hooks/use-currencies";
import { getExchangeRate } from "@/features/currencies/api/client";
import {
  A,
  Card,
  SectionLabel,
  Avatar,
  GroupAvatar,
  fmt,
  G,
  T,
  Icons,
  getUserColor,
} from "@/lib/splito-design";

/** Derive overall youOwe/youGet from groups' groupBalances (same source as group pages) */
function useOverallBalancesFromGroups(
  groups: {
    groupBalances?: { userId: string; currency: string; amount: number }[];
  }[],
  userId: string | null
) {
  return useMemo(() => {
    if (!userId || !groups?.length)
      return {
        youOwe: [] as { currency: string; amount: number }[],
        youGet: [] as { currency: string; amount: number }[],
      };
    const byCurrency: Record<string, number> = {};
    for (const group of groups) {
      const myBalances = (group.groupBalances ?? []).filter(
        (b) => b.userId === userId
      );
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
  const { total: totalOwe, isLoading: loadingOwe } = useConvertedBalanceTotal(
    oweItems,
    defaultCurrency
  );
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
        <div>
          You owe{" "}
          <span className="text-[#FF4444]">
            {formatCurrency(totalOwe, defaultCurrency)}
          </span>
        </div>
        <div>
          Owes you{" "}
          <span className="text-[#53e45d]">
            {formatCurrency(totalOwed, defaultCurrency)}
          </span>
        </div>
      </div>
    );
  }
  if (hasOwe) {
    return (
      <>
        You owe{" "}
        <span className="text-[#FF4444]">
          {formatCurrency(totalOwe, defaultCurrency)}
        </span>
      </>
    );
  }
  return (
    <>
      Owes you{" "}
      <span className="text-[#53e45d]">
        {formatCurrency(totalOwed, defaultCurrency)}
      </span>
    </>
  );
}

/** Group row: shows converted total for this group's balance for the given user */
function DashboardGroupBalance({
  group,
  userId,
  defaultCurrency,
}: {
  group: {
    id: string;
    name: string;
    groupBalances?: { userId: string; currency: string; amount: number }[];
  };
  userId: string | null;
  defaultCurrency: string;
}) {
  if (!userId || !group.groupBalances?.length) return <>No balance</>;
  const userBalances = group.groupBalances.filter((b) => b.userId === userId);
  const byCurrency = userBalances.reduce(
    (acc, b) => {
      acc[b.currency] = (acc[b.currency] ?? 0) + b.amount;
      return acc;
    },
    {} as Record<string, number>
  );
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

/** Single-line balance for group row: "+$X" (green) or "-$X" (red) or "Settled" */
function GroupBalanceShort({
  group,
  userId,
  defaultCurrency,
}: {
  group: { groupBalances?: { userId: string; currency: string; amount: number }[] };
  userId: string | null;
  defaultCurrency: string;
}) {
  const oweItems =
    !userId || !group.groupBalances?.length
      ? []
      : group.groupBalances
          .filter((b) => b.userId === userId && b.amount > 0)
          .map((b) => ({ amount: b.amount, currency: b.currency }));
  const owedItems =
    !userId || !group.groupBalances?.length
      ? []
      : group.groupBalances
          .filter((b) => b.userId === userId && b.amount < 0)
          .map((b) => ({ amount: Math.abs(b.amount), currency: b.currency }));
  const { total: oweTotal, isLoading: loadOwe } = useConvertedBalanceTotal(oweItems, defaultCurrency);
  const { total: owedTotal, isLoading: loadOwed } = useConvertedBalanceTotal(owedItems, defaultCurrency);
  if (loadOwe || loadOwed) return <span className="text-white/60">…</span>;
  const net = (owedTotal ?? 0) - (oweTotal ?? 0);
  if (net === 0) return <span style={{ color: G, fontSize: 13, fontWeight: 800, fontFamily: "monospace" }}>+{formatCurrency(0, defaultCurrency)}</span>;
  if (net > 0)
    return (
      <span
        className="font-mono font-extrabold text-[13px]"
        style={{ color: G }}
      >
        +{formatCurrency(net, defaultCurrency)}
      </span>
    );
  return (
    <span
      className="font-mono font-extrabold text-[13px]"
      style={{ color: "#F87171" }}
    >
      -{formatCurrency(Math.abs(net), defaultCurrency)}
    </span>
  );
}

/** Mobile group card balance cell: shows net + label ("owed to you" / "you owe" / "settled") */
function GroupBalanceMobileCell({
  group,
  userId,
  defaultCurrency,
}: {
  group: { groupBalances?: { userId: string; currency: string; amount: number }[] };
  userId: string | null;
  defaultCurrency: string;
}) {
  const oweItems =
    !userId || !group.groupBalances?.length
      ? []
      : group.groupBalances
          .filter((b) => b.userId === userId && b.amount > 0)
          .map((b) => ({ amount: b.amount, currency: b.currency }));
  const owedItems =
    !userId || !group.groupBalances?.length
      ? []
      : group.groupBalances
          .filter((b) => b.userId === userId && b.amount < 0)
          .map((b) => ({ amount: Math.abs(b.amount), currency: b.currency }));
  const { total: oweTotal, isLoading: loadOwe } = useConvertedBalanceTotal(oweItems, defaultCurrency);
  const { total: owedTotal, isLoading: loadOwed } = useConvertedBalanceTotal(owedItems, defaultCurrency);
  if (loadOwe || loadOwed)
    return <span style={{ color: "#888", fontSize: 14 }}>…</span>;
  const net = (owedTotal ?? 0) - (oweTotal ?? 0);
  const color = net > 0 ? G : net < 0 ? "#F87171" : T.dim;
  const prefix = net > 0 ? "+" : net < 0 ? "-" : "±";
  const label = net > 0 ? "owed to you" : net < 0 ? "you owe" : "settled";
  return (
    <div style={{ textAlign: "right" }}>
      <p style={{ fontSize: 17, fontWeight: 800, fontFamily: "var(--font-dm-mono,monospace)", color }}>
        {prefix}{formatCurrency(Math.abs(net), defaultCurrency)}
      </p>
      <p style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>{label}</p>
    </div>
  );
}

/** Single friend card for Friends Balance: avatar, name, "Owes you $X" (green) or "You owe $X" (red) */
function FriendBalanceCard({
  friendName,
  friendInit,
  color,
  oweItems,
  owedItems,
  defaultCurrency,
}: {
  friendName: string;
  friendInit: string;
  color: string;
  oweItems: { amount: number; currency: string }[];
  owedItems: { amount: number; currency: string }[];
  defaultCurrency: string;
}) {
  const { total: totalOwe } = useConvertedBalanceTotal(oweItems, defaultCurrency);
  const { total: totalOwed } = useConvertedBalanceTotal(owedItems, defaultCurrency);
  const net = (totalOwed ?? 0) - (totalOwe ?? 0);
  const balanceLine =
    net === 0
      ? { text: "Settled", color: T.muted }
      : net > 0
        ? { text: `Owes you ${formatCurrency(net, defaultCurrency)}`, color: G }
        : { text: `You owe ${formatCurrency(Math.abs(net), defaultCurrency)}`, color: "#F87171" };
  return (
    <Card
      style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}
    >
      <Avatar init={friendInit} color={color} size={42} />
      <div className="flex-1 min-w-0">
        <p
          className="text-[14px] font-bold truncate"
          style={{ color: T.bright }}
        >
          {friendName}
        </p>
        <p
          className="text-[12px] font-bold mt-1"
          style={{ color: balanceLine.color }}
        >
          {balanceLine.text}
        </p>
      </div>
    </Card>
  );
}

/** Per-friend balances from groups' groupBalances (matches group expense page) */
function useFriendBalancesFromGroups(
  groups: {
    groupBalances?: {
      userId: string;
      firendId: string;
      currency: string;
      amount: number;
    }[];
  }[],
  friends: { id: string }[],
  userId: string | null
) {
  return useMemo(() => {
    if (!userId || !groups?.length)
      return {} as Record<string, { currency: string; amount: number }[]>;
    const byFriend: Record<string, Record<string, number>> = {};
    for (const group of groups) {
      const balances = (group.groupBalances ?? []) as {
        userId: string;
        firendId: string;
        currency: string;
        amount: number;
      }[];
      for (const b of balances) {
        if (b.userId !== userId) continue;
        const friendId = b.firendId;
        if (!byFriend[friendId]) byFriend[friendId] = {};
        byFriend[friendId][b.currency] =
          (byFriend[friendId][b.currency] ?? 0) + b.amount;
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
  const [isFriendsBreakdownModalOpen, setIsFriendsBreakdownModalOpen] =
    useState(false);
  const [settleFriendId, setSettleFriendId] = useState<string | null>(null);
  const [settleFriendGroupId, setSettleFriendGroupId] = useState<string | null>(
    null
  );
  const [isSettling, setIsSettling] = useState(false);
  const { isConnected, address } = useWallet();
  const { data: groups = [], isLoading: isGroupsLoading } = useGetAllGroups();
  const { data: friends = [], isLoading: isFriendsLoading } = useGetFriends();
  const {
    data: analyticsData,
    isLoading: isAnalyticsLoading,
    error: analyticsError,
  } = useAnalytics();
  const {
    reminders,
    isLoading: isRemindersLoading,
    acceptReminder,
    rejectReminder,
    isAccepting,
    isRejecting,
    sendReminder,
    isSending,
  } = useReminders();
  const { user } = useAuthStore();
  const defaultCurrency = user?.currency || "USD";
  const { youOwe, youGet } = useOverallBalancesFromGroups(
    groups,
    user?.id ?? null
  );
  const friendBalancesFromGroups = useFriendBalancesFromGroups(
    groups,
    friends,
    user?.id ?? null
  );
  const { total: overallOweTotal, isLoading: overallOweLoading } =
    useConvertedBalanceTotal(youOwe, defaultCurrency);
  const { total: overallGetTotal, isLoading: overallGetLoading } =
    useConvertedBalanceTotal(youGet, defaultCurrency);
  const owedThisMonth = Number(analyticsData?.owed) || 0;
  const lentThisMonth = Number(analyticsData?.lent) || 0;
  const settledThisMonth = Number(analyticsData?.settled) || 0;
  const analyticsCurrency = analyticsData?.currency || defaultCurrency;
  const { total: owedConverted, isLoading: owedConvLoading } =
    useConvertedBalanceTotal(
      owedThisMonth ? [{ amount: owedThisMonth, currency: analyticsCurrency }] : [],
      defaultCurrency
    );
  const { total: lentConverted, isLoading: lentConvLoading } =
    useConvertedBalanceTotal(
      lentThisMonth ? [{ amount: lentThisMonth, currency: analyticsCurrency }] : [],
      defaultCurrency
    );
  const { total: settledConverted, isLoading: settledConvLoading } =
    useConvertedBalanceTotal(
      settledThisMonth ? [{ amount: settledThisMonth, currency: analyticsCurrency }] : [],
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
        cause: analyticsError.cause,
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

  const netOwed = (overallGetLoading || overallOweLoading) ? 0 : overallGetTotal - overallOweTotal;

  // Collect all unique expense currencies across groups for the activity card
  const activityCurrencies = useMemo(() => {
    if (!groups?.length) return [];
    const currencies = new Set<string>();
    for (const group of groups) {
      const expenses = (group as { expenses?: { currency: string }[] }).expenses ?? [];
      expenses.forEach((e) => { if (e.currency) currencies.add(e.currency); });
    }
    currencies.delete(defaultCurrency);
    return [...currencies].filter(Boolean);
  }, [groups, defaultCurrency]);

  const activityRateQueries = useQueries({
    queries: activityCurrencies.map((from) => ({
      queryKey: [CURRENCY_QUERY_KEYS.EXCHANGE_RATE, from, defaultCurrency],
      queryFn: () => getExchangeRate(from, defaultCurrency),
      staleTime: 1000 * 60 * 5,
      enabled: !!defaultCurrency && !!from,
    })),
  });

  const activityRateMap = useMemo(() => {
    const map: Record<string, number> = { [defaultCurrency]: 1 };
    activityCurrencies.forEach((c, i) => {
      const rate = activityRateQueries[i]?.data?.rate;
      if (rate) map[c] = rate;
    });
    return map;
  }, [activityCurrencies, activityRateQueries, defaultCurrency]);

  /** Recent activity from all groups (expenses + settlements) for Dashboard card */
  const recentActivityFromGroups = useMemo(() => {
    if (!user || !groups?.length) return [];
    const items: { id: string; text: string; subtext: string; date: Date; dotColor: string }[] = [];
    for (const group of groups) {
      const expenses = (group as { expenses?: { id: string; name: string; amount: number; currency: string; paidBy: string; createdAt: Date; splitType: string }[] }).expenses ?? [];
      const groupUsers = (group as { groupUsers?: { user: { id: string; name?: string | null } }[] }).groupUsers ?? [];
      const paidByName = (userId: string) =>
        userId === user.id ? "You" : (groupUsers.find((gu) => gu.user.id === userId)?.user?.name ?? "Someone");
      for (const exp of expenses) {
        const date = exp.createdAt instanceof Date ? exp.createdAt : new Date(exp.createdAt);
        const src = exp.currency || defaultCurrency;
        const rate = activityRateMap[src] ?? 1;
        const amountStr = formatCurrency(Math.abs(exp.amount) * rate, defaultCurrency);
        const timeAgo = formatRelativeTime(date);
        const subtext = `${timeAgo} · ${group.name}`;
        if (exp.splitType === "SETTLEMENT") {
          items.push({
            id: exp.id,
            text: `${paidByName(exp.paidBy)} settled ${amountStr}`,
            subtext,
            date,
            dotColor: "#A78BFA",
          });
        } else {
          items.push({
            id: exp.id,
            text: `${paidByName(exp.paidBy)} added ${exp.name} (${amountStr})`,
            subtext,
            date,
            dotColor: A,
          });
        }
      }
    }
    items.sort((a, b) => b.date.getTime() - a.date.getTime());
    return items.slice(0, 5);
  }, [groups, user?.id, defaultCurrency, activityRateMap]);

  const groupAvatarItems = (g: { groupUsers?: { user: { name: string | null; id: string } }[] }) =>
    (g.groupUsers ?? [])
      .slice(0, 4)
      .map((gu) => ({
        init: gu.user.name?.charAt(0)?.toUpperCase() || "?",
        color: getUserColor(gu.user.name),
      }));

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Sticky header – desktop only */}
      <div
        className="hidden sm:block border-b border-white/[0.07] sticky top-0 bg-[#0b0b0b]/95 backdrop-blur-xl z-10"
      >
        <div className="flex px-7 items-center h-[70px]">
          <h1 className="text-[20px] font-extrabold tracking-[-0.02em] text-white">
            Dashboard
          </h1>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-7 overflow-y-auto">
        {/* ── Mobile status bar + header (matches splito mobile spec) ── */}
        <div className="sm:hidden mb-3">
          {/* Status bar */}
         
          {/* Page header */}
          <div className="pb-2 px-0">
            <p
              className="text-[13px] font-medium"
              style={{ color: T.muted }}
            >
              Good morning,
            </p>
            <h1 className="text-[26px] font-black tracking-[-0.04em] text-white mt-1">
              <span className="text-[#22D3EE]">splito</span>
            </h1>
          </div>
        </div>

        {/* Balance hero – mobile uses net + 2-stat layout; desktop uses 3-stat layout */}
        <div
          id="dashboard-overall-balance"
          className="rounded-2xl sm:rounded-3xl border border-white/[0.09] p-4 sm:p-7 mb-5 sm:mb-7 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #141414 0%, #0f0f0f 100%)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <div
            className="absolute -top-10 -right-10 w-[200px] h-[200px] rounded-full pointer-events-none"
            style={{ background: netOwed >= 0 ? `${G}09` : "#F8717109" }}
          />

          {/* ── Mobile layout ─────────────────────────────────── */}
          <div className="sm:hidden">
            <p
              className="text-[11px] font-bold tracking-[0.1em] uppercase mb-2"
              style={{ color: T.muted }}
            >
              Net Balance
            </p>
            {isGroupsLoading ? (
              <div className="flex items-center gap-2 mb-1">
                <Loader2 className="h-5 w-5 animate-spin text-white/50" />
                <span className="text-white/60 text-sm">Loading…</span>
              </div>
            ) : (
              <>
                <p
                  className="text-[36px] font-black tracking-[-0.04em] mb-1"
                  style={{
                    color: netOwed >= 0 ? G : "#F87171",
                  }}
                >
                  {netOwed >= 0 ? "+" : "-"}
                  {overallGetLoading || overallOweLoading
                    ? "…"
                    : formatCurrency(Math.abs(netOwed), defaultCurrency)}
                </p>
                <p className="text-[13px] font-medium mb-5" style={{ color: T.sub }}>
                  {netOwed >= 0 ? "overall you're owed" : "overall you owe"}
                </p>
              </>
            )}
            <div className="h-px mb-5" style={{ background: "rgba(255,255,255,0.07)" }} />
            <div className="grid grid-cols-2 gap-0">
              {[
                ["You're owed", overallGetLoading ? "…" : formatCurrency(overallGetTotal, defaultCurrency), G],
                ["You owe", overallOweLoading ? "…" : formatCurrency(overallOweTotal, defaultCurrency), "#F87171"],
              ].map(([label, value, color], i) => (
                <div
                  key={String(label)}
                  className={i === 1 ? "pl-4 border-l border-white/[0.08]" : "pr-4"}
                >
                  <p className="text-[10px] font-bold tracking-[0.06em] uppercase mb-1.5" style={{ color: T.dim }}>
                    {label}
                  </p>
                  <p className="text-[20px] font-extrabold font-dm-mono" style={{ color: color as string }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Desktop layout (unchanged) ──────────────────────── */}
          <div className="hidden sm:block">
            <p
              className="text-[12px] font-bold tracking-[0.08em] uppercase mb-2.5"
              style={{ color: T.muted }}
            >
              Overall balance
            </p>
            <p className="text-[26px] font-extrabold tracking-[-0.02em] text-white mb-1">
              {isGroupsLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-white/50" />
                  Loading…
                </span>
              ) : youOwe.length > 0 ? (
                <>
                  Overall, you owe{" "}
                  <span style={{ color: "#F87171" }}>
                    {overallOweLoading ? "…" : formatCurrency(overallOweTotal, defaultCurrency)}
                  </span>
                </>
              ) : youGet.length > 0 ? (
                <>
                  Overall, you are owed{" "}
                  <span style={{ color: G }}>
                    +{overallGetLoading ? "…" : formatCurrency(overallGetTotal, defaultCurrency)}
                  </span>
                </>
              ) : (
                <span style={{ color: G }}>All settled ✓</span>
              )}
            </p>
            <div className="h-px my-[22px]" style={{ background: "rgba(255,255,255,0.07)" }} />
            <div className="grid grid-cols-3 gap-0">
              {[
                ["You owed this month", isAnalyticsLoading || owedConvLoading ? "…" : formatCurrency(owedConverted, defaultCurrency)],
                ["You lent this month", isAnalyticsLoading || lentConvLoading ? "…" : formatCurrency(lentConverted, defaultCurrency)],
                ["You settled this month", isAnalyticsLoading || settledConvLoading ? "…" : formatCurrency(settledThisMonth === 0 ? 0 : settledConverted, defaultCurrency)],
              ].map(([label, value], i, arr) => (
                <div
                  key={String(label)}
                  className={`min-w-0 ${i < arr.length - 1 ? "pr-[28px] border-r border-white/[0.07]" : ""} ${i > 0 ? "pl-[28px]" : ""} text-left`}
                >
                  <p className="text-[11px] mb-2.5 font-semibold tracking-[0.04em] truncate" style={{ color: T.muted }}>
                    {label}
                  </p>
                  <p className="text-[22px] font-extrabold tracking-[-0.02em] font-dm-mono truncate" style={{ color: "#e8e8e8" }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── MOBILE layout: groups → friends → activity ─────────── */}
        <div className="sm:hidden">
          {/* Your Groups */}
          <div style={{ paddingBottom: 8 }}>
            <SectionLabel>Your Groups</SectionLabel>
            {isGroupsLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-white/50" />
              </div>
            ) : (groups ?? []).length === 0 ? (
              <p style={{ color: T.muted, fontSize: 13, padding: "8px 0" }}>No groups yet</p>
            ) : (
              (groups ?? []).map((g) => {
                const memberCount = (g as { groupUsers?: unknown[] }).groupUsers?.length ?? 0;
                const ago = formatRelativeTime(new Date((g as { updatedAt: Date }).updatedAt));
                return (
                  <Link href={`/groups/${g.id}`} key={g.id}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 20,
                        padding: "15px 16px",
                        cursor: "pointer",
                        marginBottom: 10,
                      }}
                    >
                      <GroupAvatar items={groupAvatarItems(g)} size={48} radius={15} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: 15,
                            fontWeight: 800,
                            color: T.bright,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {g.name}
                        </p>
                        <p style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>
                          {memberCount} {memberCount === 1 ? "person" : "people"} · {ago}
                        </p>
                      </div>
                      <GroupBalanceMobileCell
                        group={g}
                        userId={user?.id ?? null}
                        defaultCurrency={defaultCurrency}
                      />
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          {/* Friends – horizontal scroll */}
          <div style={{ padding: "8px 0" }}>
            <SectionLabel>Friends</SectionLabel>
            {isFriendsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-white/50" />
              </div>
            ) : (friends ?? []).length === 0 ? (
              <p style={{ color: T.muted, fontSize: 13, padding: "8px 0" }}>No friends yet</p>
            ) : (
              <div className="hide-scrollbar" style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
                {(friends ?? []).map((friend) => {
                  const friendInit =
                    friend.name
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() || "?";
                  const color = getUserColor(friend.name);
                  const firstName = friend.name?.split(" ")[0] ?? "Friend";
                  return (
                    <div
                      key={friend.id}
                      style={{
                        flexShrink: 0,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 20,
                        padding: "16px 14px",
                        minWidth: 110,
                        textAlign: "center",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
                        <Avatar init={friendInit} color={color} size={40} />
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: T.bright }}>{firstName}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div style={{ padding: "16px 0 0" }}>
            <SectionLabel>Recent Activity</SectionLabel>
            {isGroupsLoading || isRemindersLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-white/50" />
              </div>
            ) : recentActivityFromGroups.length > 0 ? (
              <div
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 20,
                  overflow: "hidden",
                }}
              >
                {recentActivityFromGroups.map((a, i) => (
                  <div
                    key={a.id}
                    style={{
                      display: "flex",
                      gap: 12,
                      padding: "14px 16px",
                      borderBottom:
                        i < recentActivityFromGroups.length - 1
                          ? "1px solid rgba(255,255,255,0.06)"
                          : "none",
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: a.dotColor,
                        flexShrink: 0,
                        marginTop: 5,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, color: T.body, lineHeight: 1.5 }}>{a.text}</p>
                      <p style={{ fontSize: 11, color: T.sub, marginTop: 3, fontWeight: 600 }}>
                        {a.subtext}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 20,
                  padding: "40px 20px",
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: 36, marginBottom: 10 }}>📋</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: T.body }}>No recent activity</p>
                <p style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
                  Expenses from your groups will appear here
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── DESKTOP layout: groups+activity grid, then friends balance ─ */}
        <div className="hidden sm:block">
          <div
            className="grid gap-5 mb-7"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}
          >
            <Card className="p-[22px]">
              <div className="flex justify-between items-center mb-4">
                <SectionLabel>Your Groups</SectionLabel>
                <span
                  className="text-[11px] font-bold rounded-full px-2.5 py-1 border border-white/[0.09]"
                  style={{ color: T.muted, background: "rgba(255,255,255,0.06)" }}
                >
                  {groups?.length ?? 0} groups
                </span>
              </div>
              {isGroupsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-white/50" />
                </div>
              ) : (
                (groups ?? []).slice(0, 3).map((g, i) => (
                  <Link href={`/groups/${g.id}`} key={g.id}>
                    <div
                      className="splito-row-hover flex items-center gap-3 py-[11px] border-b border-white/[0.06] cursor-pointer last:border-b-0"
                      style={i < Math.min(groups.length, 3) - 1 ? { borderBottom: "1px solid rgba(255,255,255,0.06)" } : {}}
                    >
                      <GroupAvatar items={groupAvatarItems(g)} size={38} radius={11} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-bold text-[#f5f5f5] truncate">{g.name}</p>
                        <p className="text-[13px] font-semibold" style={{ color: T.muted }}>
                          {(Array.isArray((g as { expenses?: unknown[] }).expenses)
                            ? (g as { expenses: unknown[] }).expenses.length
                            : 0)}{" "}
                          expenses
                        </p>
                      </div>
                      <GroupBalanceShort
                        group={g}
                        userId={user?.id ?? null}
                        defaultCurrency={defaultCurrency}
                      />
                    </div>
                  </Link>
                ))
              )}
              {groups?.length === 0 && !isGroupsLoading && (
                <p className="text-sm text-white/60 py-2">No groups yet</p>
              )}
            </Card>

            <Card className="p-[22px] min-h-[200px] flex flex-col">
              <SectionLabel>Recent Activity</SectionLabel>
              {isGroupsLoading || isRemindersLoading ? (
                <div className="flex justify-center py-8 flex-1 items-center">
                  <Loader2 className="h-5 w-5 animate-spin text-white/50" />
                </div>
              ) : recentActivityFromGroups.length > 0 ? (
                <div className="flex flex-col">
                  {recentActivityFromGroups.map((a) => (
                    <div key={a.id} className="flex gap-3 py-[9px] border-b border-white/[0.06] last:border-b-0">
                      <div className="w-2 h-2 rounded-full flex-shrink-0 mt-[5px]" style={{ background: a.dotColor }} />
                      <div className="min-w-0">
                        <p className="text-[13px] font-[500] text-[#d4d4d4] leading-snug">{a.text}</p>
                        <p className="text-[11px] mt-0.5 font-[600]" style={{ color: T.sub }}>{a.subtext}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (reminders ?? []).length > 0 ? (
                <div className="flex flex-col">
                  {(reminders ?? []).slice(0, 5).map((r) => (
                    <div key={r.id} className="flex gap-3 py-2.5 border-b border-white/[0.06] last:border-b-0">
                      <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: A }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium leading-snug" style={{ color: T.body }}>{r.content || "Transaction request"}</p>
                        <p className="text-[11px] mt-0.5 font-semibold" style={{ color: T.sub }}>{r.createdAt ? formatRelativeTime(new Date(r.createdAt)) : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-[40px] mb-2" aria-hidden>📋</p>
                  <p className="text-[13px] font-medium" style={{ color: T.body }}>No recent activity</p>
                  <p className="text-[12px] mt-1" style={{ color: T.muted }}>Expenses and settlements from your groups will appear here</p>
                </div>
              )}
            </Card>
          </div>

          {/* Friends Balance – desktop grid */}
          <div>
            <SectionLabel>Friends Balance</SectionLabel>
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
              {isFriendsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-white/50" />
                </div>
              ) : (
                (friends ?? [])
                  .filter((friend) => {
                    const balances = friendBalancesFromGroups[friend.id] ?? [];
                    return balances.some((b: { amount: number }) => b.amount !== 0);
                  })
                  .map((friend) => {
                    const balances = friendBalancesFromGroups[friend.id] ?? [];
                    const oweItems = balances.filter((b: { amount: number }) => b.amount > 0).map((b: { amount: number; currency: string }) => ({ amount: b.amount, currency: b.currency }));
                    const owedItems = balances.filter((b: { amount: number }) => b.amount < 0).map((b: { amount: number; currency: string }) => ({ amount: Math.abs(b.amount), currency: b.currency }));
                    const friendInit = friend.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
                    const color = getUserColor(friend.name);
                    return (
                      <FriendBalanceCard
                        key={friend.id}
                        friendName={friend.name ?? "Friend"}
                        friendInit={friendInit}
                        color={color}
                        oweItems={oweItems}
                        owedItems={owedItems}
                        defaultCurrency={defaultCurrency}
                      />
                    );
                  })
              )}
              {(!friends || friends.length === 0) && !isFriendsLoading && (
                <p className="text-sm text-white/60 col-span-full py-4">No friends with balances</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <SettleDebtsModal
        isOpen={isSettleModalOpen}
        onClose={() => setIsSettleModalOpen(false)}
        showIndividualView={settleFriendId !== null}
        selectedFriendId={settleFriendId}
        groupId={
          settleFriendId
            ? settleFriendGroupId || ""
            : (groups && groups[0]?.id) || ""
        }
      />

      <FriendsBreakdownModal
        isOpen={isFriendsBreakdownModalOpen}
        onClose={() => setIsFriendsBreakdownModalOpen(false)}
        onSettleAll={() => {
          setIsFriendsBreakdownModalOpen(false);
          handleSettleAllClick();
        }}
      />

    </div>
  );
}
