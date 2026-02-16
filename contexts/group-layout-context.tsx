"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { DetailGroup } from "@/features/groups/api/client";

export type GroupLayoutContextValue = {
  groupId: string;
  group: DetailGroup | null;
  isLoading: boolean;
  isAdmin: boolean;
  openAddMember: () => void;
  openAddExpense: () => void;
  openSettings: () => void;
  openSettle: (friendId?: string | null) => void;
  settleFriendId: string | null;
  getSpecificDebtAmount: (friendId: string) => number;
  getSpecificDebtByCurrency: (friendId: string) => Record<string, number>;
  handleSettleFriendClick: (friendId: string) => void;
  handleSendReminder: (receiverId: string, splitId: string) => void;
  handleRemoveMember: (memberId: string) => void;
  markAsPaidMutation: { mutate: (variables: unknown, options?: unknown) => void; isPending: boolean };
  isSending: boolean;
  formatCurrency: (amount: number, currencyId: string) => string;
  defaultCurrency: string;
};

const GroupLayoutContext = createContext<GroupLayoutContextValue | null>(null);

export function GroupLayoutProvider({
  value,
  children,
}: {
  value: GroupLayoutContextValue;
  children: ReactNode;
}) {
  return (
    <GroupLayoutContext.Provider value={value}>
      {children}
    </GroupLayoutContext.Provider>
  );
}

export function useGroupLayout() {
  const ctx = useContext(GroupLayoutContext);
  if (!ctx) throw new Error("useGroupLayout must be used within GroupLayoutProvider");
  return ctx;
}
