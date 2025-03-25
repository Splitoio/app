import { Check, X } from "lucide-react";
import Image from "next/image";
import { useBalances } from "@/features/balances/hooks/use-balances";
import Cookies from "js-cookie";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ApiError } from "@/types/api-error";
import { useGetFriends } from "@/features/friends/hooks/use-get-friends";

type Debt = {
  amount: number;
  from: string;
  to: string;
};

type TransactionListProps = {
  currentUserAddress: string | null;
};

export function TransactionList() {
  const router = useRouter();
  const { data: balanceData, error } = useGetFriends();

  const debts = balanceData || [];

  useEffect(() => {
    if (error) {
      // Cast error to ApiError type
      const apiError = error as ApiError;
      const statusCode =
        apiError.response?.status || apiError.status || apiError.code;

      if (statusCode === 401) {
        Cookies.remove("sessionToken");
        router.push("/login");
        toast.error("Session expired. Please log in again.");
      } else if (error) {
        toast.error("An unexpected error occurred.");
      }
    }
  }, [error, router]);

  if (debts.length === 0) {
    return (
      <div className="text-body text-white/70 py-8 text-center">
        No transactions yet
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {debts.map((debt, index) => {
        const otherUserAddress = debt.name;

        return (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-4 py-4">
              <Image
                src={debt.image || "/default-avatar.png"}
                alt={debt.name}
                className="h-full w-full object-cover rounded-full"
                width={48}
                height={48}
              />
              <div>
                <p className="text-body font-medium text-white">
                  {otherUserAddress}
                </p>
                {/* <p className="text-body-sm text-white/70">
                  {isOwing ? "you owe" : "owes you"}
                </p> */}
              </div>
            </div>

            {debt.balances.map((balance) => {
              const isOwing = balance.amount > 0;

              return (
                <p
                  key={balance.currency}
                  className={`text-body ${
                    isOwing ? "text-[#FF4444]" : "text-[#53e45d]"
                  }`}
                >
                  {Math.abs(balance.amount).toFixed(2)} {balance.currency}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
