"use client";

import Image from "next/image";
import { useGroupLayout } from "@/contexts/group-layout-context";
import { useAuthStore } from "@/stores/authStore";

export default function GroupActivityPage() {
  const { user } = useAuthStore();
  const { group, formatCurrency } = useGroupLayout();

  if (!group || !user) return null;

  const expenses = group.expenses;

  return (
    <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
      <h3 className="text-mobile-lg sm:text-xl font-medium text-white mb-3 sm:mb-4">
        Recent Activity
      </h3>

      {expenses && expenses.length > 0 ? (
        expenses.map((expense, index) => {
          const paidBy = group.groupUsers.find((u) => u.user.id === expense.paidBy)?.user;
          if (!paidBy) return null;

          let settlementPayee = null;
          if (expense.splitType === "SETTLEMENT" && expense.expenseParticipants) {
            const payeeParticipant = expense.expenseParticipants.find((p: { amount: number }) => p.amount > 0);
            if (payeeParticipant) {
              settlementPayee = group.groupUsers.find(
                (u) => u.user.id === payeeParticipant.userId
              )?.user;
            }
          }

          return (
            <div
              key={expense.id}
              className="p-3 sm:p-4 rounded-xl flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 overflow-hidden rounded-full">
                  <Image
                    src={
                      paidBy.image ||
                      `https://api.dicebear.com/9.x/identicon/svg?seed=${paidBy.id}`
                    }
                    alt={paidBy.name || "User"}
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://api.dicebear.com/9.x/identicon/svg?seed=${paidBy.id}`;
                    }}
                  />
                </div>
                <div>
                  {expense.splitType === "SETTLEMENT" && settlementPayee ? (
                    <p className="text-mobile-base sm:text-base text-white">
                      <span className="font-medium">
                        {paidBy.id === user?.id ? "You" : paidBy.name}
                      </span>{" "}
                      marked payment to{" "}
                      <span className="font-medium">
                        {settlementPayee.id === user?.id ? "you" : settlementPayee.name}
                      </span>{" "}
                      as settled
                    </p>
                  ) : (
                    <p className="text-mobile-base sm:text-base text-white">
                      <span className="font-medium">
                        {paidBy.id === user?.id ? "You" : paidBy.name}
                      </span>{" "}
                      added expense &quot;{expense.name}&quot;
                    </p>
                  )}
                  <p className="text-mobile-xs sm:text-sm text-white/60">
                    {new Date(expense.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="text-mobile-base sm:text-base text-white font-medium">
                {formatCurrency(expense.amount, expense.currency || "USD")}
              </div>
            </div>
          );
        })
      ) : (
        <div className="text-center py-8 sm:py-12 text-mobile-base sm:text-base text-white/60">
          No activity yet
        </div>
      )}
    </div>
  );
}
