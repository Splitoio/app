"use client";

import { useMemo } from "react";
import { Trash2 } from "lucide-react";
import { useGroupLayout } from "@/contexts/group-layout-context";
import { useAuthStore } from "@/stores/authStore";
import {
  Card,
  SectionLabel,
  StatBox,
  Btn,
  Avatar,
  T,
  G,
  Icons,
  getUserColor,
} from "@/lib/splito-design";


function getInit(name: string | null): string {
  if (!name || !name.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2)
    return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function GroupMembersPage() {
  const { user } = useAuthStore();
  const {
    group,
    isAdmin,
    handleRemoveMember,
    openSettle,
    handleSendReminder,
    formatCurrency,
    defaultCurrency,
    getSpecificDebtAmount,
  } = useGroupLayout();

  const { totalSpent, youAreOwed, expenseCount } = useMemo(() => {
    if (!group || !user) return { totalSpent: 0, youAreOwed: 0, expenseCount: 0 };
    const totalSpent = (group.expenses ?? [])
      .filter((e: { splitType?: string }) => e.splitType !== "SETTLEMENT")
      .reduce((a: number, e: { amount: number }) => a + e.amount, 0);
    const youAreOwed = (group.groupBalances ?? [])
      .filter(
        (b: { userId: string; firendId: string; amount: number }) =>
          b.userId === user.id && b.amount > 0
      )
      .reduce((a: number, b: { amount: number }) => a + b.amount, 0);
    const expenseCount = (group.expenses ?? []).filter(
      (e: { splitType?: string }) => e.splitType !== "SETTLEMENT"
    ).length;
    return { totalSpent, youAreOwed, expenseCount };
  }, [group, user]);

  const formatAmount = (amount: number) =>
    formatCurrency(amount, defaultCurrency || "USD");

  if (!group || !user) return null;

  return (
    <div className="pb-6">
      <Card className="mb-5 sm:mb-[22px] overflow-hidden">
        {group.groupUsers.map((member, idx) => {
          const isCurrentUser = member.user.id === user.id;
          const color = getUserColor(member.user.name);
          const paid = (group.expenses ?? [])
            .filter(
              (e: { paidBy: string; splitType?: string }) =>
                e.paidBy === member.user.id && e.splitType !== "SETTLEMENT"
            )
            .reduce((a: number, e: { amount: number }) => a + e.amount, 0);
          const owes = getSpecificDebtAmount(member.user.id);
          const owesDisplay =
            owes > 0
              ? { text: `owes ${formatAmount(owes)}`, color: "#F87171" }
              : { text: "all clear ✓", color: G };

          return (
            <div
              key={member.user.id}
              className={idx < group.groupUsers.length - 1 ? "border-b border-white/[0.06]" : ""}
              style={{ transition: "background 0.15s" }}
            >
              <div
                className="flex items-center gap-3 sm:gap-[14px] px-4 py-4 sm:px-[22px] sm:py-[15px]"
                style={{ minHeight: 72 }}
              >
                <Avatar
                  init={getInit(member.user.name)}
                  color={color}
                  size={42}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate" style={{ color: T.bright, fontSize: 14 }}>
                    {isCurrentUser
                      ? `${member.user.name ?? "You"} (you)`
                      : member.user.name ?? "Member"}
                  </p>
                  <p
                    className="text-xs mt-0.5 truncate"
                    style={{
                      fontSize: 12,
                      color: T.muted,
                      fontWeight: 500,
                    }}
                  >
                    Paid {formatAmount(paid)} ·{" "}
                    <span style={{ color: owesDisplay.color, fontWeight: 600 }}>
                      {owesDisplay.text}
                    </span>
                  </p>
                </div>
                {!isCurrentUser ? (
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    <Btn
                      onClick={() => openSettle(member.user.id)}
                      variant="ghost"
                      style={{
                        padding: "6px 10px",
                        fontSize: 11,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontWeight: 700,
                      }}
                    >
                      <Icons.wallet /> Settle
                    </Btn>
                    <Btn
                      onClick={() =>
                        handleSendReminder(
                          member.user.id,
                          (group.expenses?.[0] as { id?: string } | undefined)?.id ?? ""
                        )
                      }
                      variant="ghost"
                      style={{
                        padding: "6px 10px",
                        fontSize: 11,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontWeight: 600,
                      }}
                    >
                      <Icons.bell /> Notify
                    </Btn>
                    {group.createdBy?.id === user.id && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.user.id)}
                        className="hidden sm:flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
                        style={{
                          background: "rgba(248,113,113,0.06)",
                          border: "1px solid rgba(248,113,113,0.15)",
                          color: "#F87171",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        <Trash2 style={{ width: 16, height: 16 }} />
                      </button>
                    )}
                  </div>
                ) : (
                  <span
                    className="flex-shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-lg sm:text-xs sm:px-3 sm:py-1.5"
                    style={{ color: T.muted, background: "rgba(255,255,255,0.06)" }}
                  >
                    You
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </Card>

      <Card style={{ padding: "22px" }}>
        <SectionLabel>Group spend breakdown</SectionLabel>
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap", marginBottom: 18 }}>
          <StatBox
            label="Total spent"
            value={formatAmount(totalSpent)}
            color="#e8e8e8"
          />
          <StatBox
            label="You're owed"
            value={formatAmount(youAreOwed)}
            color={youAreOwed >= 0 ? G : "#F87171"}
          />
          <StatBox
            label="Expenses"
            value={String(expenseCount)}
            color="#e8e8e8"
          />
        </div>
        <div
          style={{
            height: 6,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 99,
            display: "flex",
            overflow: "hidden",
            gap: 2,
          }}
        >
          {group.groupUsers.map((m) => (
            <div
              key={m.user.id}
              style={{
                width: `${100 / group.groupUsers.length}%`,
                background: getUserColor(m.user.name),
                opacity: 0.75,
                borderRadius: 99,
              }}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
