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
  A,
  G,
  Icons,
} from "@/lib/splito-design";

const MEMBER_COLORS = [
  A,
  "#A78BFA",
  G,
  "#FB923C",
  "#F472B6",
  "#FBBF24",
  "#F87171",
  "#818CF8",
];

function memberColor(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++)
    h = (h << 5) - h + userId.charCodeAt(i);
  return MEMBER_COLORS[Math.abs(h) % MEMBER_COLORS.length];
}

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
    openAddMember,
    handleRemoveMember,
    handleSettleFriendClick,
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
      <div className="flex items-center justify-between gap-3 mb-5 sm:mb-6">
        <SectionLabel>Your Members</SectionLabel>
        {isAdmin && (
          <Btn
            onClick={openAddMember}
            variant="ghost"
            className="shrink-0"
            style={{ padding: "8px 14px", fontSize: 12 }}
          >
            <Icons.userPlus /> Add Member
          </Btn>
        )}
      </div>

      <Card className="mb-5 sm:mb-[22px] overflow-hidden">
        {group.groupUsers.map((member, idx) => {
          const isCurrentUser = member.user.id === user.id;
          const color = memberColor(member.user.id);
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
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-[14px] p-4 sm:p-5">
                <div className="flex items-center min-w-0 flex-1">
                  <Avatar
                    init={getInit(member.user.name)}
                    color={color}
                    size={42}
                  />
                  <div className="ml-3 sm:flex-1 min-w-0">
                    <p
                      className="font-bold text-sm sm:text-[14px] text-white leading-tight"
                      style={{ color: T.bright }}
                    >
                      {isCurrentUser
                        ? `${member.user.name ?? "You"} (you)`
                        : member.user.name ?? "Member"}
                    </p>
                    <p
                      className="text-xs sm:text-[12px] mt-1 font-medium"
                      style={{ color: T.muted }}
                    >
                      Paid {formatAmount(paid)} ·{" "}
                      <span style={{ color: owesDisplay.color, fontWeight: 600 }}>
                        {owesDisplay.text}
                      </span>
                    </p>
                  </div>
                </div>
                {!isCurrentUser && (
                  <div className="flex items-center gap-2 sm:gap-2 flex-wrap sm:flex-nowrap sm:shrink-0 pl-[54px] sm:pl-0">
                    <Btn
                      onClick={() => handleSettleFriendClick(member.user.id)}
                      variant="ghost"
                      className="flex-1 sm:flex-initial min-w-0"
                      style={{
                        padding: "8px 12px",
                        fontSize: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 5,
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
                      className="flex-1 sm:flex-initial min-w-0"
                      style={{
                        padding: "8px 12px",
                        fontSize: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 5,
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

      <Card className="p-4 sm:p-[22px]">
        <SectionLabel>Group spend breakdown</SectionLabel>
        <div className="flex gap-4 sm:gap-8 flex-wrap mb-4 sm:mb-[18px]">
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
                background: memberColor(m.user.id),
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
