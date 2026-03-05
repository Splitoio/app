"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, AlertTriangle, X, CheckCircle } from "lucide-react";
import { staggerContainer, slideUp } from "@/utils/animations";
import { useConvertedBalanceTotal } from "@/features/currencies/hooks/use-currencies";
import { Card, GroupAvatar, Icons, Tag, G, T } from "@/lib/splito-design";

const AVATAR_COLORS = ["#22D3EE", "#a78bfa", "#34D399", "#fb923c"];

function getInit(name: string | null | undefined, fallback: string): string {
  if (!name || !name.trim()) return fallback;
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2)
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  return name.charAt(0).toUpperCase();
}

function relativeTime(date: Date): string {
  const now = new Date();
  const d = new Date(date);
  const sec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (sec < 60) return "Just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return `${Math.floor(sec / 604800)}w ago`;
}

type GroupItem = {
  id: string;
  name: string;
  groupBalances?: { userId: string; currency: string; amount: number }[];
  groupUsers?: { user: { id: string; name?: string | null } }[];
  expenses?: unknown[];
  updatedAt: Date;
};

function GroupCard({
  group,
  user,
  defaultCurrency,
  formatCurrency,
}: {
  group: GroupItem;
  user: { id: string; name?: string | null } | null;
  defaultCurrency: string;
  formatCurrency: (amount: number, currency: string) => string;
}) {
  const balances = group.groupBalances || [];
  const memberIds = Array.from(new Set(balances.map((b) => b.userId)));
  // Prefer groupUsers for initials (like Dashboard); fallback to balance-derived list with "?" for others
  const avatarItems =
    group.groupUsers && group.groupUsers.length > 0
      ? group.groupUsers.slice(0, 4).map((gu, i) => ({
          init: getInit(gu.user.name, gu.user.id === user?.id ? "Y" : "?"),
          color: AVATAR_COLORS[i % AVATAR_COLORS.length],
        }))
      : memberIds.slice(0, 4).map((userId, i) => ({
          init:
            userId === user?.id
              ? getInit(user?.name ?? null, "Y")
              : "?",
          color: AVATAR_COLORS[i % AVATAR_COLORS.length],
        }));
  if (avatarItems.length === 0)
    avatarItems.push({
      init: group.name.charAt(0).toUpperCase() || "G",
      color: AVATAR_COLORS[0],
    });

  const userBalances = balances.filter((b) => b.userId === user?.id);
  const byCurrency: Record<string, number> = {};
  userBalances.forEach((b) => {
    byCurrency[b.currency] = (byCurrency[b.currency] ?? 0) + b.amount;
  });
  const oweItems = Object.entries(byCurrency)
    .filter(([, a]) => a > 0)
    .map(([currency, amount]) => ({ amount, currency }));
  const owedItems = Object.entries(byCurrency)
    .filter(([, a]) => a < 0)
    .map(([currency, amount]) => ({ amount: Math.abs(amount), currency }));

  const { total: totalOwe } = useConvertedBalanceTotal(oweItems, defaultCurrency);
  const { total: totalOwed } = useConvertedBalanceTotal(owedItems, defaultCurrency);
  const net = totalOwed - totalOwe;

  const balanceLabel = (() => {
    if (net === 0) return { text: "±$0", color: T.muted };
    if (net > 0) return { text: `+$${net.toFixed(2)}`, color: G };
    return { text: `-$${Math.abs(net).toFixed(2)}`, color: "#FF4444" };
  })();
  const totalMagnitude = Object.values(byCurrency).reduce((s, a) => s + Math.abs(a), 0);
  const totalLabel = totalMagnitude > 0 ? formatCurrency(totalMagnitude, defaultCurrency) : formatCurrency(0, defaultCurrency);
  const memberCount = memberIds.length;
  const expenseCount = Array.isArray((group as { expenses?: unknown[] }).expenses)
    ? (group as { expenses: unknown[] }).expenses.length
    : 0;
  const ago = relativeTime(group.updatedAt);
  const groupUrl = `/groups/${group.id}`;

  const isEmpty = net === 0 && expenseCount === 0;

  return (
    <motion.div variants={slideUp}>
      <Link
        href={groupUrl}
        className="flex items-center w-full text-left transition-colors hover:bg-white/[0.03] gap-3 sm:gap-4 py-4 px-4 sm:py-[18px] sm:px-6"
      >
        <GroupAvatar items={avatarItems} size={52} radius={17} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-[15px] font-extrabold text-white truncate tracking-[-0.01em]" style={{ color: T.bright }}>
              {group.name}
            </p>
            {isEmpty && <span className="shrink-0"><Tag color={T.sub}>Empty</Tag></span>}
          </div>
          <p className="text-[12px] font-semibold" style={{ color: T.muted }}>
            {memberCount} members · {expenseCount} expenses · {ago}
          </p>
        </div>
        <div className="flex items-center shrink-0" style={{ gap: 8 }}>
          <div className="text-right">
            <p
              className="font-[family-name:var(--font-dm-mono)] text-[17px] font-extrabold"
              style={{ color: balanceLabel.color }}
            >
              {balanceLabel.text}
            </p>
            <p className="text-[11px] font-semibold mt-[3px]" style={{ color: T.muted }}>
              total {totalLabel}
            </p>
          </div>
          <span className="text-white/40">{Icons.chevR({ size: 18 })}</span>
        </div>
      </Link>
    </motion.div>
  );
}

export interface GroupsListContentProps {
  filteredGroups: GroupItem[];
  user: { id: string; name?: string | null } | null;
  defaultCurrency: string;
  formatCurrency: (amount: number, currency: string) => string;
  getCurrencySymbol: (id: string) => string;
  netBalanceFormatted: string;
  netBalanceColor: string;
  totalSpentFormatted: string;
  showDeleteModal: boolean;
  setShowDeleteModal: (v: boolean) => void;
  groupToDelete: { id: string; name: string } | null;
  setGroupToDelete: (v: { id: string; name: string } | null) => void;
  deleteSuccess: boolean;
  deleteError: string | null;
  isDeleting: boolean;
  confirmDelete: () => void;
}

export function GroupsListContent(props: GroupsListContentProps) {
  const {
    filteredGroups,
    user,
    defaultCurrency,
    formatCurrency,
    netBalanceFormatted,
    netBalanceColor,
    totalSpentFormatted,
    showDeleteModal,
    setShowDeleteModal,
    groupToDelete,
    setGroupToDelete,
    deleteSuccess,
    deleteError,
    isDeleting,
    confirmDelete,
  } = props;

  return (
    <div>
      <div
        className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6"
      >
        <Card className="p-3 sm:p-5 min-w-0">
          <p className="uppercase mb-1 sm:mb-2 text-[10px] sm:text-[11px] font-bold tracking-wider truncate" style={{ color: T.muted }}>Groups</p>
          <p className="font-[family-name:var(--font-dm-mono)] text-base sm:text-[22px] font-extrabold tracking-tight truncate" style={{ color: "#e8e8e8" }}>{filteredGroups.length}</p>
        </Card>
        <Card className="p-3 sm:p-5 min-w-0">
          <p className="uppercase mb-1 sm:mb-2 text-[10px] sm:text-[11px] font-bold tracking-wider truncate" style={{ color: T.muted }}>Total spent</p>
          <p className="font-[family-name:var(--font-dm-mono)] text-base sm:text-[22px] font-extrabold tracking-tight truncate" style={{ color: "#e8e8e8" }}>{totalSpentFormatted}</p>
        </Card>
        <Card className="p-3 sm:p-5 min-w-0">
          <p className="uppercase mb-1 sm:mb-2 text-[10px] sm:text-[11px] font-bold tracking-wider truncate" style={{ color: T.muted }}>Net balance</p>
          <p className="font-[family-name:var(--font-dm-mono)] text-base sm:text-[22px] font-extrabold tracking-tight truncate" style={{ color: netBalanceColor }}>{netBalanceFormatted}</p>
        </Card>
      </div>

      <Card style={{ padding: 0 }}>
        {filteredGroups.length === 0 ? (
          <div style={{ padding: "50px", textAlign: "center" }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: T.muted }}>No groups found</p>
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="initial" animate="animate">
            {filteredGroups.map((group, idx) => (
              <div
                key={group.id}
                style={{
                  borderBottom: idx < filteredGroups.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                }}
              >
                <GroupCard
                  group={group}
                  user={user}
                  defaultCurrency={defaultCurrency}
                  formatCurrency={formatCurrency}
                />
              </div>
            ))}
          </motion.div>
        )}
      </Card>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 brightness-50 p-4">
          <div className="relative z-10 w-full max-w-[360px] sm:max-w-[400px] rounded-xl bg-[#101012] p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg sm:text-xl font-medium text-white">Delete Group</h3>
              <button onClick={() => { setShowDeleteModal(false); setGroupToDelete(null); }} className="rounded-full p-1 hover:bg-white/10">
                <X className="h-5 w-5 text-white/70" />
              </button>
            </div>
            {deleteSuccess ? (
              <div className="flex flex-col items-center justify-center py-4">
                <CheckCircle className="mb-3 sm:mb-4 h-8 sm:h-10 w-8 sm:w-10 text-green-500" />
                <p className="text-center text-mobile-base sm:text-base text-white">Group &quot;{groupToDelete?.name}&quot; has been deleted.</p>
              </div>
            ) : (
              <>
                {deleteError ? (
                  <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-red-400">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 sm:h-5 w-4 sm:w-5 flex-shrink-0" />
                      <p className="text-mobile-sm sm:text-sm">{deleteError}</p>
                    </div>
                  </div>
                ) : (
                  <p className="mb-4 text-mobile-base sm:text-base text-white/70">
                    Are you sure you want to delete &quot;{groupToDelete?.name}&quot;? This action cannot be undone.
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setShowDeleteModal(false); setGroupToDelete(null); }} className="rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 text-mobile-sm sm:text-sm text-white/70 hover:bg-white/5">Cancel</button>
                  <button onClick={confirmDelete} disabled={isDeleting} className="flex items-center gap-1.5 sm:gap-2 rounded-lg bg-red-500/10 px-3 sm:px-4 py-1.5 sm:py-2 text-mobile-sm sm:text-sm text-red-400 hover:bg-red-500/20 disabled:opacity-50">
                    {isDeleting ? (<><Loader2 className="h-3.5 sm:h-4 w-3.5 sm:w-4 animate-spin" /><span>Deleting...</span></>) : <span>Delete</span>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
