"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { DetailGroup } from "@/features/groups/api/client";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/constants";
import { useAuthStore } from "@/stores/authStore";
import { formatCurrency } from "@/utils/formatters";
import { useConvertedBalanceTotal } from "@/features/currencies/hooks/use-currencies";
import { useGroupLayout } from "@/contexts/group-layout-context";
import { cn } from "@/lib/utils";
import { Btn, Icons, A, T } from "@/lib/splito-design";

export function GroupInfoHeader({
  groupId,
  onSettleClick,
  group,
  onAddExpenseClick,
  onSettingsClick: _onSettingsClick,
}: {
  groupId: string;
  onSettleClick: () => void;
  group: DetailGroup;
  onAddExpenseClick: () => void;
  onSettingsClick: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAddingExpense, _setIsAddingExpense] = useState(false);
  const [_isSettling, setIsSettling] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { openAddMember, isAdmin } = useGroupLayout();
  const defaultCurrency = user?.currency || "USD";

  // Compute balance arrays (use empty when no group so hooks are unconditional)
  const balancesByCurrency = (() => {
    if (!group?.groupBalances) return {} as Record<string, number>;
    const userBalances = group.groupBalances.filter(
      (balance) => balance.userId === user?.id
    );
    const currencyMap: Record<string, number> = {};
    userBalances.forEach((balance) => {
      if (!currencyMap[balance.currency]) {
        currencyMap[balance.currency] = 0;
      }
      currencyMap[balance.currency] += balance.amount;
    });
    return currencyMap;
  })();
  const owed: { currency: string; amount: number }[] = [];
  const owe: { currency: string; amount: number }[] = [];
  Object.entries(balancesByCurrency).forEach(([currency, amount]) => {
    if (amount > 0) {
      owed.push({ currency, amount });
    } else if (amount < 0) {
      owe.push({ currency, amount: Math.abs(amount) });
    }
  });

  // owed = positive balances = amounts the current user OWES (debts)
  // owe  = negative balances (abs) = amounts the current user IS OWED (credits)
  const { total: totalOwedToUser, isLoading: loadingOwe } = useConvertedBalanceTotal(
    owe,
    defaultCurrency
  );
  const { total: totalUserOwes, isLoading: loadingOwed } = useConvertedBalanceTotal(
    owed,
    defaultCurrency
  );
  const converting = loadingOwe || loadingOwed;

  if (!group) return null;

  const handleAddExpenseClick = () => {
    onAddExpenseClick();
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

  // Order matches mobile design artifact: Splits · Members · Activity
  const tabs = [
    { label: "Splits", href: `/groups/${groupId}/splits` },
    { label: "Members", href: `/groups/${groupId}/members` },
    { label: "Activity", href: `/groups/${groupId}/activity` },
  ];

  const memberCount = group.groupUsers?.length ?? 0;
  // net = credits (owed to user) - debts (user owes) — same formula as GroupBalanceShort on dashboard
  const net = converting ? null : totalOwedToUser - totalUserOwes;
  const isOwedToUser = net !== null && net > 0;
  const isUserOwes = net !== null && net < 0;
  const netAmount = net !== null ? Math.abs(net) : 0;
  const balanceLabel = isOwedToUser ? "owed to you" : isUserOwes ? "you owe" : "all settled";

  // #region agent log
  useEffect(() => {
    if (!group?.groupBalances?.length || !user?.id) return;
    const userBalances = group.groupBalances.filter((b) => b.userId === user.id);
    const byCurrency: Record<string, number> = {};
    userBalances.forEach((b) => {
      byCurrency[b.currency] = (byCurrency[b.currency] ?? 0) + b.amount;
    });
    fetch("http://127.0.0.1:7660/ingest/2772b0cc-df03-41e9-90e6-6be9025e849d", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "64e217" },
      body: JSON.stringify({
        sessionId: "64e217",
        runId: "pre-fix",
        hypothesisId: "H2",
        location: "group-info-header.tsx:headerNet",
        message: "Group header balance inputs",
        data: {
          groupId,
          byCurrency,
          totalOwedToUserConv: converting ? null : totalOwedToUser,
          totalUserOwesConv: converting ? null : totalUserOwes,
          netConv: converting ? null : net,
          pairRowCount: userBalances.length,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }, [
    group?.groupBalances,
    user?.id,
    groupId,
    converting,
    totalOwedToUser,
    totalUserOwes,
    net,
  ]);
  // #endregion

  const desktopSubtitle = converting
    ? <span style={{ color: "rgba(255,255,255,0.4)" }}>…</span>
    : isOwedToUser
      ? <>You are owed <span className="font-bold text-[#34D399]">{formatCurrency(netAmount, defaultCurrency)}</span></>
      : isUserOwes
        ? <>You owe <span className="font-bold text-[#F87171]">{formatCurrency(netAmount, defaultCurrency)}</span></>
        : <span className="font-bold text-[#34D399]">All settled ✓</span>;

  return (
    <div
      className="flex flex-col sm:sticky sm:top-0 z-[40]"
      style={{
        background: "rgba(11,11,11,0.95)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Top row: mobile = [icon][name+members][balance]; desktop = [← Back][name+balance text][Settle all][Add Expense] */}
      <div className="flex items-center justify-between gap-3 px-4 mt-3 sm:mt-4 sm:px-7 h-14 sm:h-[70px] min-h-[56px]">
        <div className="flex items-center gap-3 sm:gap-[14px] min-w-0 flex-1">
          {/* Mobile back button */}
          <button
            onClick={() => router.push("/groups")}
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#d4d4d4",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ←
          </button>
          <div className="min-w-0">
            <h1 className="text-[20px] sm:text-[20px] font-extrabold tracking-[-0.03em] text-white truncate">
              {group.name}
            </h1>
            <p className="text-[11px] sm:text-[12px] font-medium mt-0.5" style={{ color: T.mid }}>
              <span className="sm:hidden">{memberCount} member{memberCount !== 1 ? "s" : ""}</span>
              <span className="hidden sm:inline">{desktopSubtitle}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end flex-shrink-0 text-right sm:hidden">
          <span
            className={cn(
              "text-[17px] font-bold tabular-nums",
              isOwedToUser && "text-[#34D399]",
              isUserOwes && "text-[#F87171]",
              !isOwedToUser && !isUserOwes && "text-[#34D399]"
            )}
          >
            {converting ? "…" : isOwedToUser ? `+${formatCurrency(totalOwedToUser, defaultCurrency)}` : isUserOwes ? formatCurrency(totalUserOwes, defaultCurrency) : "All settled ✓"}
          </span>
          <span className="text-[11px] font-medium" style={{ color: T.mid }}>
            {balanceLabel}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          <Btn
            onClick={handleSettleClick}
            variant="ghost"
            style={{ padding: "9px 16px", fontSize: 13 }}
          >
            <Icons.wallet /> Settle all
          </Btn>
          <button
            onClick={handleAddExpenseClick}
            disabled={isAddingExpense}
            className="flex items-center gap-1.5 rounded-xl text-[13px] font-extrabold text-[#0a0a0a] transition-all disabled:opacity-70 hover:opacity-90"
            style={{ background: A, padding: "10px 18px", gap: 6 }}
          >
            {isAddingExpense ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icons.plus />}
            Add Expense
          </button>
        </div>
      </div>

      {/* Action buttons row: mobile only */}
      <div className="flex gap-2 px-4 sm:px-7 py-3 sm:py-4 sm:hidden">
        <button
          type="button"
          onClick={handleSettleClick}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl"
          style={{
            padding: "10px 14px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#f5f5f5",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <Icons.wallet /> Settle All
        </button>
        <button
          onClick={handleAddExpenseClick}
          disabled={isAddingExpense}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl text-[13px] font-extrabold text-[#0a0a0a] transition-all disabled:opacity-70 hover:opacity-90 min-h-[42px]"
          style={{ background: A, padding: "10px 18px", gap: 6 }}
        >
          {isAddingExpense ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icons.plus />}
          Add Expense
        </button>
      </div>

      <div
        className="mx-4 sm:mx-7"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      />

      {/* Tabs: Splits, Activity, Members + Add Member button */}
      <div className="flex items-center justify-between px-4 sm:px-7 py-4 sm:py-6">
        <div
          className="flex rounded-[14px] transition-all w-full sm:w-auto"
          style={{
            gap: 3,
            padding: 4,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex-1 sm:flex-initial rounded-[10px] text-[13px] transition-all text-center",
                  isActive ? "bg-white/10 text-white font-bold" : "text-white/60 font-medium"
                )}
                style={{ padding: "8px 20px" }}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
        <Btn
          onClick={openAddMember}
          variant="ghost"
          style={{ padding: "8px 14px", fontSize: 12, flexShrink: 0 }}
          className="sm:!flex !hidden"
        >
          <Icons.userPlus /> Add Member
        </Btn>
      </div>
    </div>
  );
}
