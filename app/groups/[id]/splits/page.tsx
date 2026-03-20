"use client";

import { useState, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { toast } from "sonner";
import { useGroupLayout } from "@/contexts/group-layout-context";
import { useAuthStore } from "@/stores/authStore";
import { useDeleteExpense } from "@/features/expenses/hooks/use-create-expense";
import { getExchangeRate } from "@/features/currencies/api/client";
import { CURRENCY_QUERY_KEYS } from "@/features/currencies/hooks/use-currencies";
import {
  Card,
  SectionLabel,
  Avatar,
  Tag,
  Btn,
  Icons,
  G,
  T,
  getUserColor,
} from "@/lib/splito-design";

type ExpenseWithParticipants = {
  id: string;
  name: string;
  category: string;
  amount: number;
  currency: string;
  paidBy: string;
  expenseDate: Date | string;
  createdAt: Date | string;
  splitType?: string;
  expenseParticipants?: { userId: string; amount: number }[];
};

const CATEGORY_STYLES: Record<string, { bg: string; icon: string }> = {
  ACCOMMODATION: { bg: "rgba(255,255,255,0.06)", icon: "🏠" },
  FOOD: { bg: "rgba(255,255,255,0.06)", icon: "🍽" },
  TRAVEL: { bg: "rgba(255,255,255,0.06)", icon: "🚗" },
  TRANSPORT: { bg: "rgba(255,255,255,0.06)", icon: "🚗" },
};

function getCategoryStyle(category: string) {
  const key = (category || "").toUpperCase();
  const known = CATEGORY_STYLES[key] || CATEGORY_STYLES[key.split(/[\s-_]/)[0]];
  if (known) return known;
  // If not a known keyword, treat it as a raw emoji
  const trimmed = (category || "").trim();
  if (trimmed && trimmed !== "OTHER") return { bg: "rgba(255,255,255,0.06)", icon: trimmed };
  return { bg: "rgba(255,255,255,0.06)", icon: "🧾" };
}

function formatDateKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
}

function ExpenseRow({
  expense,
  groupUsers,
  currentUserId,
  currentUserName,
  formatCurrency,
  onNotify,
  onSettle,
  onDelete,
  isLast,
}: {
  expense: ExpenseWithParticipants;
  groupUsers: { user: { id: string; name: string | null; image: string | null } }[];
  currentUserId: string;
  currentUserName: string | null;
  formatCurrency: (amount: number, currency: string) => string;
  onNotify: () => void;
  onSettle: () => void;
  onDelete: () => void;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const paidByUser = groupUsers.find((gu) => gu.user.id === expense.paidBy)?.user;
  const paidByName =
    expense.paidBy === currentUserId ? (currentUserName || "You") : (paidByUser?.name ?? "Someone");

  const participants = expense.expenseParticipants ?? [];
  const oweCount = participants.filter((p) => p.amount > 0).length;
  const settledCount = 0;
  const settledLabel = `${settledCount}/${oweCount} settled`;

  const myShare = participants.find((p) => p.userId === currentUserId)?.amount ?? 0;
  const iAmPayer = expense.paidBy === currentUserId;
  const isInvolved = iAmPayer || participants.some((p) => p.userId === currentUserId);
  const pending = participants.filter((p) => p.amount > 0).reduce((a, p) => a + p.amount, 0);

  const categoryStyle = getCategoryStyle(expense.category);

  const statusLine = (() => {
    if (!isInvolved) return null;
    if (myShare > 0 && !iAmPayer) return { text: `you owe ${formatCurrency(myShare, expense.currency)}`, color: "#F87171" };
    if (iAmPayer && pending > 0) return { text: `owed ${formatCurrency(pending, expense.currency)}`, color: G };
    if (iAmPayer && pending === 0) return { text: "all settled ✓", color: G };
    return null;
  })();

  return (
    <div style={{ borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.06)" }}>
      <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="w-full text-left transition-colors hover:bg-white/[0.02]"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "18px 20px",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            background: "rgba(20,20,20,1)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            flexShrink: 0,
          }}
        >
          {categoryStyle.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p style={{ fontWeight: 700, fontSize: 15, color: T.bright, marginBottom: 2 }}>
            {expense.name}
            </p>
            <p style={{ fontSize: 12, color: T.muted, fontWeight: 500 }}>
              Paid by {paidByName} · {settledLabel}
            </p>
          </div>
        <div style={{ textAlign: "right", flexShrink: 0, marginRight: 8 }}>
          <p
            style={{
              fontWeight: 800,
              fontSize: 17,
              color: T.bright,
              fontFamily: "'DM Mono',monospace",
            }}
          >
            {formatCurrency(expense.amount, expense.currency)}
          </p>
          {statusLine && (
            <p style={{ fontSize: 12, color: statusLine.color, fontWeight: 600, marginTop: 2 }}>
              {statusLine.text}
            </p>
          )}
        </div>
        <span
          className="sm:!flex  !hidden"
          style={{
            color: T.dim,
            display: "flex",
            transition: "transform 0.2s",
            transform: expanded ? "rotate(180deg)" : "none",
          }}
        >
          {Icons.chevD()}
        </span>
      </button>
      {expanded && (
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(0,0,0,0.2)",
            padding: "18px 22px",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <SectionLabel className="!mb-2">Breakdown</SectionLabel>
          <div style={{ marginBottom: 16 }}>
            {participants
              .filter((p) => p.amount > 0)
              .map((p) => {
                const u = groupUsers.find((gu) => gu.user.id === p.userId)?.user;
                const name = p.userId === currentUserId ? (currentUserName || "You") : (u?.name ?? "Someone");
                const isSettled = false;
                return (
                  <div
                    key={p.userId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 0",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar
                        init={u ? (u.name ?? "?")[0].toUpperCase() : "?"}
                        size={28}
                        color={getUserColor(u?.name || "?")}
                      />
                      <span style={{ color: T.body, fontSize: 13, fontWeight: 500 }}>{name}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          color: isSettled ? G : "#F87171",
                          fontSize: 13,
                          fontWeight: 700,
                          fontFamily: "'DM Mono',monospace",
                        }}
                      >
                        {formatCurrency(p.amount, expense.currency)}
                      </span>
                      {isInvolved && (
                        <Tag color={isSettled ? G : "#F87171"}>
                          {isSettled ? "settled" : "pending"}
                        </Tag>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          {isInvolved && (
            <div style={{ display: "flex", gap: 8, paddingTop: 16 }}>
              <Btn variant="ghost" onClick={onSettle} className="splito-sbtn" style={{ padding: "8px 16px", fontSize: 12 }}>
                <Icons.check /> Settle
              </Btn>
              <Btn variant="ghost" onClick={onNotify} className="splito-abtn" style={{ padding: "8px 16px", fontSize: 12 }}>
                <Icons.bell /> Notify
              </Btn>
              <Btn variant="danger" onClick={onDelete} style={{ padding: "8px 14px", fontSize: 12 }}>
                <Icons.trash size={14} /> Delete
              </Btn>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function GroupSplitsPage() {
  const { user } = useAuthStore();
  const [expenseToDelete, setExpenseToDelete] = useState<{ id: string; name: string } | null>(null);
  const {
    group,
    formatCurrency,
    defaultCurrency,
    openSettle,
    handleSendReminder,
    openAddExpense,
  } = useGroupLayout();
  const deleteExpenseMutation = useDeleteExpense(group?.id ?? "");

  const expenses = (group?.expenses ?? []) as ExpenseWithParticipants[];
  const nonSettlement = useMemo(
    () => expenses.filter((e) => e.splitType !== "SETTLEMENT"),
    [expenses]
  );

  // Fetch exchange rates for all unique expense currencies that differ from defaultCurrency
  const expenseCurrencies = useMemo(
    () => [...new Set(nonSettlement.map((e) => e.currency).filter((c) => c && c !== defaultCurrency))],
    [nonSettlement, defaultCurrency]
  );
  const rateQueries = useQueries({
    queries: expenseCurrencies.map((from) => ({
      queryKey: [CURRENCY_QUERY_KEYS.EXCHANGE_RATE, from, defaultCurrency],
      queryFn: () => getExchangeRate(from, defaultCurrency),
      staleTime: 1000 * 60 * 5,
      enabled: !!defaultCurrency && !!from,
    })),
  });
  const rateMap = useMemo(() => {
    const map: Record<string, number> = {};
    expenseCurrencies.forEach((c, i) => {
      const rate = rateQueries[i]?.data?.rate;
      if (rate) map[c] = rate;
    });
    return map;
  }, [expenseCurrencies, rateQueries]);

  // Converts an amount from its expense currency to defaultCurrency, then formats
  const convertedFormatCurrency = (amount: number, currency: string): string => {
    if (!defaultCurrency || currency === defaultCurrency) return formatCurrency(amount, currency);
    const rate = rateMap[currency];
    if (!rate) return formatCurrency(amount, currency); // fall back to original if rate not loaded
    return formatCurrency(amount * rate, defaultCurrency);
  };

  const byDate = useMemo(() => {
    const map = new Map<string, ExpenseWithParticipants[]>();
    const sorted = [...nonSettlement].sort(
      (a, b) =>
        new Date(b.expenseDate ?? b.createdAt).getTime() -
        new Date(a.expenseDate ?? a.createdAt).getTime()
    );
    for (const e of sorted) {
      const key = formatDateKey(e.expenseDate ?? e.createdAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries());
  }, [nonSettlement]);

  if (!group || !user) return null;

  return (
    <div className="space-y-6">
      {byDate.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <p style={{ fontSize: 48, marginBottom: 18 }}>💸</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: T.body, marginBottom: 8 }}>
            No expenses yet
          </p>
          <p style={{ fontSize: 14, color: T.sub }}>Add your first expense to get started</p>
          <button
            type="button"
            onClick={openAddExpense}
            className="mt-4 inline-flex items-center gap-2 rounded-xl text-[13px] font-extrabold text-[#0a0a0a] transition-opacity hover:opacity-90"
            style={{ background: "#22D3EE", padding: "10px 18px", gap: 6 }}
          >
            <Icons.plus /> Add Expense
          </button>
        </div>
      ) : (
        byDate.map(([dateLabel, dateExpenses]) => (
          <section key={dateLabel} style={{ marginBottom: 24 }}>
            <SectionLabel>{dateLabel}</SectionLabel>
            <Card
              style={{
                padding: 0,
                borderRadius: 24,
              }}
            >
              {dateExpenses.map((expense, idx) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
            groupUsers={group.groupUsers}
            currentUserId={user.id}
            currentUserName={user.name ?? null}
                  formatCurrency={convertedFormatCurrency}
                  isLast={idx === dateExpenses.length - 1}
                  onNotify={() => {
                    const firstOwer = expense.expenseParticipants?.find((p) => p.amount > 0);
                    if (firstOwer) handleSendReminder(firstOwer.userId, expense.id);
                  }}
                  onSettle={() => {
                    openSettle();
                  }}
                  onDelete={() => {
                    if (!group?.id) {
                      toast.error("Group not found");
                      return;
                    }
                    if (deleteExpenseMutation.isPending) return;
                    setExpenseToDelete({ id: expense.id, name: expense.name });
                  }}
                />
              ))}
            </Card>
          </section>
        ))
      )}

      {expenseToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 !mt-0"
          onClick={() => {
            if (!deleteExpenseMutation.isPending) setExpenseToDelete(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f0f10] p-5 sm:p-6 shadow-[0_20px_80px_rgba(0,0,0,0.7)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg sm:text-xl font-semibold text-white">Delete Expense</h3>
            <p className="mt-3 text-sm sm:text-base text-white/70">
              Delete &quot;{expenseToDelete.name}&quot;? This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                disabled={deleteExpenseMutation.isPending}
                className="rounded-lg px-4 py-2 text-sm text-white/70 hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteExpenseMutation.mutate(expenseToDelete.id, {
                    onSuccess: () => setExpenseToDelete(null),
                  });
                }}
                disabled={deleteExpenseMutation.isPending}
                className="rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-50"
              >
                {deleteExpenseMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
