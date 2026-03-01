"use client";

import { useMemo } from "react";
import { useGroupLayout } from "@/contexts/group-layout-context";
import { useAuthStore } from "@/stores/authStore";
import { formatRelativeTime } from "@/lib/utils";

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
  | { type: "expense"; id: string; date: Date; expense: ExpenseItem; paidByName: string; settlementPayeeName: string | null; settlementPayeeId: string | null }
  | JoinItem;

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
        const payeeParticipant = expense.expenseParticipants.find((p: { amount: number }) => p.amount > 0);
        if (payeeParticipant) {
          const payeeUser = group.groupUsers.find((u) => u.user.id === payeeParticipant.userId)?.user;
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
          date: createdAt instanceof Date ? createdAt : new Date(createdAt),
          userName: gu.user?.name ?? "Someone",
        });
      }
    }

    list.sort((a, b) => b.date.getTime() - a.date.getTime());
    return list;
  }, [group, user]);

  if (!group || !user) return null;

  return (
    <div className="p-4 sm:p-6 space-y-0">
      <h3 className="text-mobile-lg sm:text-xl font-medium text-white mb-3 sm:mb-4">
        Recent Activity
      </h3>

      {activities.length > 0 ? (
        <ul className="divide-y divide-white/10">
          {activities.map((item) => {
            if (item.type === "join") {
              return (
                <li
                  key={item.id}
                  className="py-3 sm:py-3.5 flex items-center justify-between gap-4"
                >
                  <span className="text-mobile-base sm:text-base text-white">
                    {item.userName} joined the group
                  </span>
                  <span className="text-mobile-sm sm:text-sm text-white/60 shrink-0">
                    {formatRelativeTime(item.date)}
                  </span>
                </li>
              );
            }

            const { expense, paidByName, settlementPayeeName, settlementPayeeId } = item;
            const isYouPayer = expense.paidBy === user.id;
            const payerLabel = isYouPayer ? "You" : paidByName;
            const amountStr = formatCurrency(expense.amount, expense.currency || "USD");

            // Red = money out, Green = money in (from current user's perspective)
            let amountColor: "red" | "green" | "white" = "white";
            if (expense.splitType === "SETTLEMENT" && settlementPayeeName && settlementPayeeId !== null) {
              if (settlementPayeeId === user.id) amountColor = "green"; // payment to you as settled
              else if (isYouPayer) amountColor = "red"; // you marked payment to someone as settled
            } else {
              if (isYouPayer) amountColor = "red"; // you added expense (you paid)
              else {
                const myPart = expense.expenseParticipants?.find((p: { userId: string }) => p.userId === user.id);
                if (myPart) {
                  if (myPart.amount < 0) amountColor = "red"; // you owe
                  else if (myPart.amount > 0) amountColor = "green"; // they owe you
                }
              }
            }

            const amountStyle =
              amountColor === "red"
                ? { color: "#FF4444" }
                : amountColor === "green"
                  ? { color: "#53E45E" }
                  : undefined;
            const amountClass = amountColor === "white" ? "text-white" : undefined;

            if (expense.splitType === "SETTLEMENT" && settlementPayeeName) {
              const payeeLabel = settlementPayeeId === user.id ? "you" : settlementPayeeName;
              return (
                <li
                  key={item.id}
                  className="py-3 sm:py-3.5 flex items-center justify-between gap-4"
                >
                  <span className="text-mobile-base sm:text-base text-white">
                    {payerLabel} marked payment to {payeeLabel} as settled{" "}
                    <span style={amountStyle} className={amountClass}>({amountStr})</span>
                  </span>
                  <span className="text-mobile-sm sm:text-sm text-white/60 shrink-0">
                    {formatRelativeTime(item.date)}
                  </span>
                </li>
              );
            }

            return (
              <li
                key={item.id}
                className="py-3 sm:py-3.5 flex items-center justify-between gap-4"
              >
                <span className="text-mobile-base sm:text-base text-white">
                  {payerLabel} added {expense.name} <span style={amountStyle} className={amountClass}>({amountStr})</span>
                </span>
                <span className="text-mobile-sm sm:text-sm text-white/60 shrink-0">
                  {formatRelativeTime(item.date)}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="text-center py-8 sm:py-12 text-mobile-base sm:text-base text-white/60">
          No activity yet
        </div>
      )}
    </div>
  );
}
