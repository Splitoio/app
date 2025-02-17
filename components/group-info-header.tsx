"use client";

import { useGroups } from "@/stores/groups";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useWallet } from "@/hooks/useWallet";

export function GroupInfoHeader({
  groupId,
  onSettleClick,
}: {
  groupId: string;
  onSettleClick: () => void;
}) {
  const { groups } = useGroups();
  const router = useRouter();
  const { address } = useWallet();
  const group = groups.find((g) => g.id === groupId);

  if (!group) return null;

  const getMyDebtInfo = () => {
    if (!address) return { amount: 0, type: "none" };

    // If I'm the payer, find how much others owe me
    if (group.paidBy === address) {
      const othersOweMe = group.debts.reduce(
        (sum, debt) => sum + debt.amount,
        0
      );
      return { amount: othersOweMe, type: "owed" };
    }

    // If someone else paid, find how much I owe them
    const myDebt = group.debts.find((debt) => debt.from === address);
    return {
      amount: myDebt?.amount || 0,
      type: "owe",
    };
  };

  const debtInfo = getMyDebtInfo();

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-6">
          <div className="h-32 w-32 overflow-hidden rounded-full">
            <Image
              src={group.image || "/group_icon_placeholder.svg"}
              alt={group.name}
              width={1000}
              height={1000}
              quality={100}
              priority={true}
              className="h-full w-auto object-cover"
            />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-h1 text-white">{group.name}</h1>
            <div className="inline-flex items-center rounded-xl bg-[#1F1F23]/50 px-3 py-1">
              <span className="text-body text-white/70">
                {debtInfo.type === "owed" ? "You are owed" : "You owe"}{" "}
                <span
                  className={
                    debtInfo.type === "owed"
                      ? "text-[#53e45d]"
                      : "text-[#FF4444]"
                  }
                >
                  ${debtInfo.amount.toFixed(2)}
                </span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 -mt-2">
          <div className="animate-border-light w-[173px]">
            <button
              onClick={() => router.push(`/groups/${groupId}/edit`)}
              className="w-full h-[46px] rounded-[15px] bg-[#000000] bg-opacity-80 text-body font-medium text-white hover:bg-[#383838] transition-colors"
            >
              Add Expense
            </button>
          </div>
          <div className="animate-border-light w-[173px]">
            <button
              onClick={onSettleClick}
              className="w-full h-[46px] rounded-[15px] bg-[#3d426e] bg-opacity-80 text-body font-medium text-white hover:bg-[#383838] transition-colors"
            >
              Settle Debts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
