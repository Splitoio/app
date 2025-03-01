import { Check, X } from "lucide-react";
import Image from "next/image";
import { useBalances } from "@/features/balances/hooks/use-balances";

type Debt = {
  amount: number;
  from: string;
  to: string;
};

type TransactionListProps = {
  currentUserAddress: string | null;
};

export function TransactionList({ currentUserAddress }: TransactionListProps) {
  const { data: balanceData } = useBalances();
  const debts = balanceData?.debts || [];

  if (!currentUserAddress || debts.length === 0) {
    return (
      <div className="text-body text-white/70 py-8 text-center">
        No transactions yet
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {debts.map((debt, index) => {
        const isOwing = debt.from === currentUserAddress;
        const otherUserAddress = isOwing ? debt.to : debt.from;

        return (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-4 py-4">
              <Image
                src="/default-avatar.png"
                alt={otherUserAddress}
                className="h-full w-full object-cover rounded-full"
                width={48}
                height={48}
              />
              <div>
                <p className="text-body font-medium text-white">
                  {otherUserAddress}
                </p>
                <p className="text-body-sm text-white/70">
                  {isOwing ? "you owe" : "owes you"}
                </p>
              </div>
            </div>
            <p
              className={`text-body ${
                isOwing ? "text-[#FF4444]" : "text-[#53e45d]"
              }`}
            >
              ${Math.abs(debt.amount).toFixed(2)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
