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
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "15px 22px",
                }}
              >
                <Avatar
                  init={getInit(member.user.name)}
                  color={color}
                  size={42}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: T.bright }}>
                    {isCurrentUser
                      ? `${member.user.name ?? "You"} (you)`
                      : member.user.name ?? "Member"}
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: T.muted,
                      marginTop: 3,
                      fontWeight: 500,
                    }}
                  >
                    Paid {formatAmount(paid)} ·{" "}
                    <span style={{ color: owesDisplay.color, fontWeight: 600 }}>
                      {owesDisplay.text}
                    </span>
                  </p>
                </div>
                {!isCurrentUser && (
                  <div style={{ display: "flex", gap: 7 }}>
                    <Btn
                      onClick={() => openSettle(member.user.id)}
                      variant="ghost"
                      style={{
                        padding: "8px 14px",
                        fontSize: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
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
                        padding: "8px 14px",
                        fontSize: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        fontWeight: 600,
                      }}
                    >
                      <Icons.bell /> Notify
                    </Btn>
                    {group.createdBy?.id === user.id && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.user.id)}
                        className="shrink-0 flex items-center justify-center w-9 h-9 sm:w-[36px] sm:h-[36px] rounded-xl"
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
