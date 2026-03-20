"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, AlertTriangle, X, CheckCircle } from "lucide-react";
import { staggerContainer, slideUp } from "@/utils/animations";
import { useConvertedBalanceTotal } from "@/features/currencies/hooks/use-currencies";
import { GroupAvatar, Card, Tag, G, T, Icons, getUserColor } from "@/lib/splito-design";
import { formatRelativeTime } from "@/lib/utils";

type GroupItem = {
  id: string;
  name: string;
  groupBalances?: { userId: string; currency: string; amount: number }[];
  groupUsers?: { user: { id: string; name?: string | null } }[];
  expenses?: { amount: number; currency: string; splitType?: string }[];
  updatedAt: Date;
};

/** Balance cell used by both mobile cards and desktop rows */
function GroupBalanceCell({
  group,
  user,
  defaultCurrency,
  formatCurrency,
  variant = "desktop",
}: {
  group: GroupItem;
  user: { id: string } | null;
  defaultCurrency: string;
  formatCurrency: (amount: number, currency: string) => string;
  variant?: "mobile" | "desktop";
}) {
  const balances = group.groupBalances || [];
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

  const { total: oweTotal, isLoading: loadOwe } = useConvertedBalanceTotal(oweItems, defaultCurrency);
  const { total: owedTotal, isLoading: loadOwed } = useConvertedBalanceTotal(owedItems, defaultCurrency);

  const expenseItems = (group.expenses || [])
    .filter((e) => e.splitType !== "SETTLEMENT")
    .map((e) => ({
      amount: Math.abs(e.amount),
      currency: e.currency,
    }));
  const { total: totalSpent, isLoading: loadSpent } = useConvertedBalanceTotal(expenseItems, defaultCurrency);

  if (loadOwe || loadOwed)
    return <span style={{ color: "#888", fontSize: variant === "mobile" ? 12 : 14 }}>…</span>;

  const net = (owedTotal ?? 0) - (oweTotal ?? 0);
  const color = net > 0 ? G : net < 0 ? "#F87171" : T.dim;
  const prefix = net > 0 ? "+" : net < 0 ? "-" : "±";
  const isMobile = variant === "mobile";

  return (
    <div
      className="text-right flex-shrink-0 min-w-0 truncate"
      style={isMobile ? { maxWidth: "40%" } : undefined}
    >
      <p
        className="truncate"
        style={{
          fontSize: isMobile ? 15 : 17,
          fontWeight: 800,
          fontFamily: "var(--font-dm-mono,monospace)",
          color,
          letterSpacing: "-0.01em",
        }}
      >
        {prefix}{formatCurrency(Math.abs(net), defaultCurrency)}
      </p>
      <p
        className="truncate mt-0.5"
        style={{
          fontSize: isMobile ? 10 : 11,
          color: T.sub,
          fontWeight: 500,
        }}
      >
        {loadSpent ? "…" : formatCurrency(totalSpent ?? 0, defaultCurrency)} spent
      </p>
    </div>
  );
}

/** Mobile: individual card per group */
function GroupMobileCard({
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
  const avatarItems = (group.groupUsers ?? [])
    .slice(0, 4)
    .map((gu) => ({
      init: gu.user.name?.charAt(0)?.toUpperCase() || "?",
      color: getUserColor(gu.user.name ?? null),
    }));

  const memberCount = (group.groupUsers ?? []).length;
  const expenseCount = Array.isArray(group.expenses) ? group.expenses.length : 0;
  const ago = formatRelativeTime(group.updatedAt instanceof Date ? group.updatedAt : new Date(group.updatedAt));
  const isEmpty = expenseCount === 0;
  const subtitle = `${memberCount} ${memberCount === 1 ? "person" : "people"} · ${expenseCount} expense${expenseCount !== 1 ? "s" : ""} · ${ago}`;

  return (
    <motion.div variants={slideUp}>
      <Link href={`/groups/${group.id}`}>
        <div
          className="flex items-center gap-3 min-h-[76px] rounded-xl border cursor-pointer mb-2.5 px-4 py-4"
          style={{
            background: "rgba(255,255,255,0.04)",
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          <GroupAvatar items={avatarItems} size={44} radius={14} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p
                className="truncate text-[15px] font-extrabold"
                style={{ color: T.bright }}
              >
                {group.name}
              </p>
              {isEmpty && <span className="shrink-0"><Tag color={T.sub}>Empty</Tag></span>}
            </div>
            <p className="text-xs truncate" style={{ color: T.muted, fontWeight: 500 }}>
              {subtitle}
            </p>
          </div>
          <GroupBalanceCell
            group={group}
            user={user}
            defaultCurrency={defaultCurrency}
            formatCurrency={formatCurrency}
            variant="mobile"
          />
        </div>
      </Link>
    </motion.div>
  );
}

/** Desktop: row inside a shared Card */
function GroupDesktopRow({
  group,
  user,
  defaultCurrency,
  formatCurrency,
  isLast,
}: {
  group: GroupItem;
  user: { id: string; name?: string | null } | null;
  defaultCurrency: string;
  formatCurrency: (amount: number, currency: string) => string;
  isLast: boolean;
}) {
  const avatarItems = (group.groupUsers ?? [])
    .slice(0, 4)
    .map((gu) => ({
      init: gu.user.name?.charAt(0)?.toUpperCase() || "?",
      color: getUserColor(gu.user.name ?? null),
    }));

  const memberCount = (group.groupUsers ?? []).length;
  const expenseCount = Array.isArray(group.expenses) ? group.expenses.length : 0;
  const ago = formatRelativeTime(group.updatedAt instanceof Date ? group.updatedAt : new Date(group.updatedAt));
  const isEmpty = expenseCount === 0;

  return (
    <motion.div variants={slideUp}>
      <Link href={`/groups/${group.id}`}>
        <div
          className="rw"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "16px 24px",
            borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.06)",
            cursor: "pointer",
            transition: "background 0.15s",
          }}
        >
          <GroupAvatar items={avatarItems} size={52} radius={17} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: T.bright,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  letterSpacing: "-0.01em",
                }}
              >
                {group.name}
              </p>
              {isEmpty && <span className="shrink-0"><Tag color={T.sub}>Empty</Tag></span>}
            </div>
            <p style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>
              {memberCount} {memberCount === 1 ? "member" : "members"} · {expenseCount} expense{expenseCount !== 1 ? "s" : ""} · {ago}
            </p>
          </div>
          <GroupBalanceCell
            group={group}
            user={user}
            defaultCurrency={defaultCurrency}
            formatCurrency={formatCurrency}
          />
          <div style={{ color: T.dim, display: "flex", flexShrink: 0 }}>{Icons.chevR({})}</div>
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
      {/* ── MOBILE layout ── */}
      <div className="sm:hidden">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 sm:gap-[10px] mb-4 sm:mb-5">
          {[
            ["GROUPS", String(filteredGroups.length), "#e8e8e8"],
            ["SPENT", totalSpentFormatted, "#e8e8e8"],
            ["SETTLED", netBalanceFormatted, netBalanceColor],
          ].map(([label, value, color]) => (
            <div
              key={label}
              className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-3 text-center"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1 truncate" style={{ color: T.muted }}>
                {label}
              </p>
              <p className="text-sm font-extrabold truncate tabular-nums" style={{ color, fontFamily: "var(--font-dm-mono,monospace)" }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Group cards */}
        {filteredGroups.length === 0 ? (
          <div style={{ padding: "50px 20px", textAlign: "center", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: T.muted }}>No groups found</p>
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="initial" animate="animate">
            {filteredGroups.map((group) => (
              <GroupMobileCard
                key={group.id}
                group={group}
                user={user}
                defaultCurrency={defaultCurrency}
                formatCurrency={formatCurrency}
              />
            ))}
          </motion.div>
        )}

        {/* Create New Group button */}
        <button
          onClick={() => document.dispatchEvent(new CustomEvent("open-create-group-modal"))}
          style={{
            width: "100%", padding: "16px", background: "rgba(255,255,255,0.03)",
            border: "1.5px dashed rgba(255,255,255,0.13)", borderRadius: 20,
            color: T.muted, fontSize: 14, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 8, marginTop: 4,
          }}
        >
          + Create New Group
        </button>
      </div>

      {/* ── DESKTOP layout ── */}
      <div className="hidden sm:block">
        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 26 }}>
          {([
            ["Groups", String(filteredGroups.length), "#e8e8e8"],
            ["Total spent", totalSpentFormatted, "#e8e8e8"],
            ["Net balance", netBalanceFormatted, netBalanceColor],
          ] as [string, string, string][]).map(([label, value, color]) => (
            <Card key={label} style={{ padding: "18px 20px" }}>
              <p style={{ color: T.muted, fontSize: 11, marginBottom: 8, fontWeight: 700, letterSpacing: "0.05em" }}>{label}</p>
              <p style={{ color, fontSize: 22, fontWeight: 800, fontFamily: "var(--font-dm-mono,monospace)", letterSpacing: "-0.02em" }}>{value}</p>
            </Card>
          ))}
        </div>

        {filteredGroups.length === 0 ? (
          <div style={{ padding: "50px 20px", textAlign: "center", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: T.muted }}>No groups found</p>
          </div>
        ) : (
          <Card>
            <motion.div variants={staggerContainer} initial="initial" animate="animate" style={{ overflow: "hidden" }}>
              {filteredGroups.map((group, idx) => (
                <GroupDesktopRow
                  key={group.id}
                  group={group}
                  user={user}
                  defaultCurrency={defaultCurrency}
                  formatCurrency={formatCurrency}
                  isLast={idx === filteredGroups.length - 1}
                />
              ))}
            </motion.div>
          </Card>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative z-10 w-full max-w-[360px] sm:max-w-[400px] rounded-xl bg-[#101012] p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg sm:text-xl font-medium text-white">Delete Group</h3>
              <button
                onClick={() => { setShowDeleteModal(false); setGroupToDelete(null); }}
                className="rounded-full p-1 hover:bg-white/10"
              >
                <X className="h-5 w-5 text-white/70" />
              </button>
            </div>
            {deleteSuccess ? (
              <div className="flex flex-col items-center justify-center py-4">
                <CheckCircle className="mb-3 h-8 w-8 text-green-500" />
                <p className="text-center text-sm text-white">
                  Group &quot;{groupToDelete?.name}&quot; has been deleted.
                </p>
              </div>
            ) : (
              <>
                {deleteError ? (
                  <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-red-400">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <p className="text-sm">{deleteError}</p>
                    </div>
                  </div>
                ) : (
                  <p className="mb-4 text-sm text-white/70">
                    Are you sure you want to delete &quot;{groupToDelete?.name}&quot;? This action cannot be undone.
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setShowDeleteModal(false); setGroupToDelete(null); }}
                    className="rounded-lg px-4 py-2 text-sm text-white/70 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={isDeleting}
                    className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /><span>Deleting...</span></>
                    ) : (
                      <span>Delete</span>
                    )}
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
