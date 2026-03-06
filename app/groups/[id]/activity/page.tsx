"use client";

import { useMemo } from "react";
import { useGroupLayout } from "@/contexts/group-layout-context";
import { useAuthStore } from "@/stores/authStore";
import { formatRelativeTime } from "@/lib/utils";
import { Card, SectionLabel, T, A, G } from "@/lib/splito-design";

type ExpenseItem = {
  id: string;
  name: string;
  amount: number;
  currency: string | null;
  paidBy: string;
  createdAt: Date;
  splitType: string;
  expenseParticipants?: { userId: string; amount: number }[];
};

type JoinItem = {
  type: "join";
  id: string;
  date: Date;
  userName: string;
};

type ActivityItem =
  | {
      type: "expense";
      id: string;
      date: Date;
      expense: ExpenseItem;
      paidByName: string;
      settlementPayeeName: string | null;
      settlementPayeeId: string | null;
    }
  | JoinItem;

const DOT_COLORS: Record<string, string> = {
  paid: G,
  added: A,
  settled: "#A78BFA",
  created: "#FB923C",
  join: "#FB923C",
};

export default function GroupActivityPage() {
  const { user } = useAuthStore();
  const { group, formatCurrency } = useGroupLayout();

  const activities = useMemo((): ActivityItem[] => {
    if (!group || !user) return [];

    const list: ActivityItem[] = [];

    for (const expense of group.expenses ?? []) {
      const paidBy = group.groupUsers.find((u) => u.user.id === expense.paidBy)?.user;
      const paidByName = paidBy?.name ?? "Someone";
      let settlementPayeeName: string | null = null;
      let settlementPayeeId: string | null = null;
      if (expense.splitType === "SETTLEMENT" && expense.expenseParticipants) {
        const payeeParticipant = expense.expenseParticipants.find(
          (p: { amount: number }) => p.amount > 0
        );
        if (payeeParticipant) {
          const payeeUser = group.groupUsers.find(
            (u) => u.user.id === payeeParticipant.userId
          )?.user;
          settlementPayeeName = payeeUser?.name ?? null;
          settlementPayeeId = payeeParticipant.userId ?? null;
        }
      }
      list.push({
        type: "expense",
        id: expense.id,
        date: new Date(expense.createdAt),
        expense: expense as ExpenseItem,
        paidByName,
        settlementPayeeName,
        settlementPayeeId,
      });
    }

    for (const gu of group.groupUsers ?? []) {
      const createdAt = (gu as { createdAt?: Date }).createdAt;
      if (createdAt) {
        list.push({
          type: "join",
          id: `join-${gu.userId}`,
          date:
            createdAt instanceof Date ? createdAt : new Date(createdAt),
          userName: gu.user?.name ?? "Someone",
        });
      }
    }

    list.sort((a, b) => b.date.getTime() - a.date.getTime());
    return list;
  }, [group, user]);

  if (!group || !user) return null;

  return (
    <div style={{ padding: "0 0 24px" }}>
      <SectionLabel>Recent Activity</SectionLabel>

      {activities.length > 0 ? (
        <Card>
          {activities.map((item, idx) => {
            if (item.type === "join") {
              return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "15px 22px",
                    borderBottom:
                      idx < activities.length - 1
                        ? "1px solid rgba(255,255,255,0.06)"
                        : "none",
                  }}
                >
                  <div
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      background: DOT_COLORS.join,
                      flexShrink: 0,
                    }}
                  />
                  <p
                    style={{
                      flex: 1,
                      fontSize: 13,
                      color: T.body,
                      fontWeight: 500,
                    }}
                  >
                    {item.userName} joined the group
                  </p>
                  <span
                    style={{
                      color: T.sub,
                      fontSize: 12,
                      flexShrink: 0,
                      fontWeight: 600,
                    }}
                  >
                    {formatRelativeTime(item.date)}
                  </span>
                </div>
              );
            }

            const {
              expense,
              paidByName,
              settlementPayeeName,
              settlementPayeeId,
            } = item;
            const isYouPayer = expense.paidBy === user.id;
            const payerLabel = isYouPayer ? "You" : paidByName;
            const amountStr = formatCurrency(
              expense.amount,
              expense.currency || "USD"
            );

            let activityType: keyof typeof DOT_COLORS = "added";
            if (
              expense.splitType === "SETTLEMENT" &&
              settlementPayeeName &&
              settlementPayeeId !== null
            ) {
              activityType = "paid";
            } else if (expense.splitType === "SETTLEMENT") {
              activityType = "settled";
            }

            let amountColor = T.bright;
            if (
              expense.splitType === "SETTLEMENT" &&
              settlementPayeeName &&
              settlementPayeeId !== null
            ) {
              if (settlementPayeeId === user.id) amountColor = G;
              else if (isYouPayer) amountColor = "#F87171";
            } else {
              if (isYouPayer) amountColor = "#F87171";
              else {
                const myPart = expense.expenseParticipants?.find(
                  (p: { userId: string }) => p.userId === user.id
                );
                if (myPart) {
                  if (myPart.amount < 0) amountColor = "#F87171";
                  else if (myPart.amount > 0) amountColor = G;
                }
              }
            }

            if (
              expense.splitType === "SETTLEMENT" &&
              settlementPayeeName
            ) {
              const payeeLabel =
                settlementPayeeId === user.id ? "you" : settlementPayeeName;
              return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "15px 22px",
                    borderBottom:
                      idx < activities.length - 1
                        ? "1px solid rgba(255,255,255,0.06)"
                        : "none",
                  }}
                >
                  <div
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      background: DOT_COLORS[activityType],
                      flexShrink: 0,
                    }}
                  />
                  <p
                    style={{
                      flex: 1,
                      fontSize: 13,
                      color: T.body,
                      fontWeight: 500,
                    }}
                  >
                    {payerLabel} marked payment to {payeeLabel} as settled{" "}
                    <span style={{ color: amountColor }}>({amountStr})</span>
                  </p>
                  <span
                    style={{
                      color: T.sub,
                      fontSize: 12,
                      flexShrink: 0,
                      fontWeight: 600,
                    }}
                  >
                    {formatRelativeTime(item.date)}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "15px 22px",
                  borderBottom:
                    idx < activities.length - 1
                      ? "1px solid rgba(255,255,255,0.06)"
                      : "none",
                }}
              >
                <div
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: DOT_COLORS[activityType],
                    flexShrink: 0,
                  }}
                />
                <p
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: T.body,
                    fontWeight: 500,
                  }}
                >
                  {payerLabel} added {expense.name}{" "}
                  <span style={{ color: amountColor }}>({amountStr})</span>
                </p>
                <span
                  style={{
                    color: T.sub,
                    fontSize: 12,
                    flexShrink: 0,
                    fontWeight: 600,
                  }}
                >
                  {formatRelativeTime(item.date)}
                </span>
              </div>
            );
          })}
        </Card>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "80px 20px",
          }}
        >
          <p style={{ fontSize: 48, marginBottom: 18 }}>💸</p>
          <p
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: T.body,
              marginBottom: 8,
            }}
          >
            No activity yet
          </p>
          <p style={{ fontSize: 14, color: T.sub }}>
            Expenses and settlements will show here
          </p>
        </div>
      )}
    </div>
  );
}
