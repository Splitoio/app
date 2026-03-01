"use client";

import type React from "react";

import { useGroups, type Split, type Debt } from "@/stores/groups";
import { useState, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useCreateGroup } from "@/features/groups/hooks/use-create-group";
import { useAuthStore } from "@/stores/authStore";
import { User } from "@/api-helpers/modelSchema";
import { useCreateExpense } from "@/features/expenses/hooks/use-create-expense";
import type { CreateExpenseParams } from "@/features/expenses/hooks/use-create-expense";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/constants";
import Image from "next/image";
import {
  useGetFiatCurrencies,
  useGetAllCurrencies,
} from "@/features/currencies/hooks/use-currencies";
import { CurrencyType } from "@/api-helpers/types";
import ResolverSelector from "./ResolverSelector";
import axios from "axios";
import CurrencyDropdown from "./currency-dropdown";
import TimeLockToggle from "./ui/TimeLockToggle";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: User[];
  groupId: string;
}

interface ExpenseFormData {
  name: string;
  description: string;
  amount: string;
  splitType: string;
  currency: string;
  currencyType: CurrencyType;
  chainId?: string;
  tokenId?: string;
  timeLockIn: boolean;
  paidBy: string;
}

// Define an interface for the expense payload (matches CreateExpenseParams)
type ExpensePayload = CreateExpenseParams;

type Option = import("./ResolverSelector").Option;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
function useAllChainsTokens() {
  const [options, setOptions] = useState<Option[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/multichain/all-chains-tokens`, {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data: any) => {
        if (cancelled || data == null) return;
        const chains = Array.isArray(data) ? data : data.chainsWithTokens || [];
        const opts: Option[] = [];
        chains.forEach((chain: any) => {
          (chain.tokens || []).forEach((token: any) => {
            opts.push({
              id: token.id || token.symbol,
              symbol: token.symbol,
              name: token.name,
              chainId: chain.chainId,
              type: token.type,
            });
          });
        });
        setOptions(opts);
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return options;
}

export function AddExpenseModal({
  isOpen,
  onClose,
  members,
  groupId,
}: AddExpenseModalProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  // Fetch supported currencies
  const { data: fiatCurrencies, isLoading: isLoadingFiat } =
    useGetFiatCurrencies();
  const { data: allCurrencies, isLoading: isLoadingAll } =
    useGetAllCurrencies();

  // Helper function to get currency symbol from the currencies data
  const getCurrencySymbol = (currencyId: string): string => {
    const currency = allCurrencies?.currencies?.find(
      (c) => c.id === currencyId
    );
    return currency?.symbol || currencyId;
  };

  // Helper function to format currency using actual symbols from API
  const formatCurrency = (amount: number, currencyId: string): string => {
    const symbol = getCurrencySymbol(currencyId);
    // For currencies like JPY, don't show decimals
    const decimals = currencyId === "JPY" ? 0 : 2;
    return `${symbol}${amount.toFixed(decimals)}`;
  };

  // Helper function to get currency placeholder using actual symbols
  const getCurrencyPlaceholder = (currencyId: string): string => {
    const symbol = getCurrencySymbol(currencyId);
    const amount = currencyId === "JPY" ? "5000" : "50";
    return `${symbol}${amount}`;
  };

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState<ExpenseFormData>({
    name: "",
    description: "",
    amount: "",
    splitType: "equal",
    currency: "USD",
    currencyType: "FIAT", // Default to FIAT
    timeLockIn: false, // Default to not locked in
    paidBy: user?.id || "",
  });

  const [lockPrice, setLockPrice] = useState(true);
  const [splits, setSplits] = useState<Split[]>([]);
  const [percentages, setPercentages] = useState<{ [key: string]: number }>({});
  const expenseMutation = useCreateExpense(groupId);

  // Reset to step 1 when modal opens
  useEffect(() => {
    if (isOpen) setStep(1);
  }, [isOpen]);

  const allChainTokenOptions = useAllChainsTokens();
  const [resolver, setResolver] = useState<Option | undefined>(undefined);

  // Set default paid by user when the component loads
  useEffect(() => {
    if (user && members.length > 0) {
      setFormData((prev) => ({
        ...prev,
        paidBy: user.id,
      }));
    }
  }, [user, members]);

  useEffect(() => {
    const allMembers = members.map((m) => m.id);

    let newSplits: Split[] = [];

    switch (formData.splitType) {
      case "equal":
        const equalAmount = Number(formData.amount) / allMembers.length;
        newSplits = allMembers.map((id) => ({
          address: id,
          amount: equalAmount,
        }));
        break;

      case "percentage":
        const equalPercentage = 100 / allMembers.length;
        newSplits = allMembers.map((id) => ({
          address: id,
          amount: (Number(formData.amount) * equalPercentage) / 100,
          percentage: equalPercentage,
        }));
        break;

      case "custom":
        newSplits = allMembers.map((id) => ({
          address: id,
          amount: 0,
        }));
        break;
    }

    setSplits(newSplits);
  }, [members, formData.amount, formData.splitType]);

  const updateCustomSplit = (id: string, amount: number) => {
    setSplits((current) =>
      current.map((split) =>
        split.address === id ? { ...split, amount } : split
      )
    );
  };

  const updatePercentage = (id: string, percentage: number) => {
    setPercentages((current) => ({
      ...current,
      [id]: percentage,
    }));

    setSplits((current) =>
      current.map((split) =>
        split.address === id
          ? {
              ...split,
              amount: (Number(formData.amount) * percentage) / 100,
              percentage: percentage,
            }
          : split
      )
    );
  };

  const calculateDebts = (splits: Split[], paidBy: string): Debt[] => {
    const debts: Debt[] = [];
    const payer = splits.find((s) => s.address === paidBy);

    if (!payer) return debts;

    splits.forEach((split) => {
      if (split.address !== paidBy && split.amount > 0) {
        debts.push({
          from: split.address,
          to: paidBy,
          amount: split.amount,
        });
      }
    });

    return debts;
  };

  const validateSplits = () => {
    const totalSplit = splits.reduce((sum, split) => sum + split.amount, 0);
    return Math.abs(totalSplit - Number(formData.amount)) < 0.01;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.amount ||
      !formData.currency ||
      !formData.paidBy ||
      !groupId ||
      !splits.length
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate split amounts
    if (!validateSplits()) {
      toast.error("Split amounts must equal the total amount");
      return;
    }

    // Ensure proper fields are included based on currency type
    if (
      formData.currencyType === "TOKEN" &&
      (!formData.chainId || !formData.tokenId)
    ) {
      toast.error("Please select both blockchain and token for token expenses");
      return;
    }

    // Create a properly typed payload
    const payload: ExpensePayload = {
      category: "OTHER",
      name: formData.name || "Expense",
      description: formData.description || "",
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      currencyType: formData.currencyType,
      timeLockIn: formData.timeLockIn,
      paidBy: formData.paidBy,
      splitType: formData.splitType.toUpperCase(),
      participants: splits.map((split) => ({
        userId: split.address,
        amount: split.amount,
      })),
      groupId: groupId,
    };

    // Add optional fields based on currency type
    if (formData.currencyType === "TOKEN") {
      payload.chainId = formData.chainId;
      payload.tokenId = formData.tokenId;
    }

    expenseMutation.mutate(payload, {
      onSuccess: async (data: any) => {
        // If a resolver is selected, set accepted tokens for this expense
        if (resolver && data?.expense?.id) {
          if (!resolver.id || !resolver.chainId) {
            toast.error("Please select a valid token resolver (not fiat)");
            return;
          }
          try {
            await axios.put(
              `${API_URL}/api/expenses/${data.expense.id}/accepted-tokens`,
              {
                acceptedTokenIds: [resolver.id],
              },
              { withCredentials: true }
            );
          } catch (err) {
            toast.error("Failed to set accepted token for this expense");
          }
        }

        toast.success("Expense added successfully");

        // refetch the specific group data
        queryClient.invalidateQueries({
          queryKey: [QueryKeys.GROUPS, groupId],
        });

        // refetch the general groups list and balances
        queryClient.invalidateQueries({ queryKey: [QueryKeys.GROUPS] });
        queryClient.invalidateQueries({ queryKey: [QueryKeys.EXPENSES] });
        queryClient.invalidateQueries({ queryKey: [QueryKeys.BALANCES] });

        onClose();
      },
      onError: (error) => {
        toast.error(
          error.message || "Failed to add expense. Please try again."
        );
        console.error("Error adding expense:", error);
      },
    });
  };

  useEffect(() => {
    if (formData.splitType !== "percentage") return;

    const allMembers = members.map((m) => m.id);
    const equalPercentage = 100 / allMembers.length;

    const initialPercentages = Object.fromEntries(
      allMembers.map((id) => [id, equalPercentage])
    );
    setPercentages(initialPercentages);
  }, [members, formData.splitType]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Find user details for the paid by dropdown
  const getPaidByUserName = (userId: string) => {
    const member = members.find((m) => m.id === userId);
    return member?.name || "You";
  };

  // When currency is selected (step 1), sync currencyType, chainId, tokenId from API currency
  const handleCurrencySelect = (currencies: string[]) => {
    const currencyId = currencies[0] || "";
    const currency = allCurrencies?.currencies?.find((c) => c.id === currencyId);
    setFormData((prev) => {
      const next = { ...prev, currency: currencyId };
      if (currency) {
        next.currencyType = currency.type === "FIAT" ? "FIAT" : "TOKEN";
        if (next.currencyType === "TOKEN") {
          next.chainId = currency.chainId ?? undefined;
          next.tokenId = currency.id;
        } else {
          next.chainId = undefined;
          next.tokenId = undefined;
        }
      }
      return next;
    });
  };

  const isCrypto = formData.currencyType === "TOKEN";
  const canProceedStep1 = formData.name.trim() !== "" && formData.currency !== "";
  const canProceedStep2 = formData.amount !== "" && Number(formData.amount) > 0 && formData.paidBy !== "";

  // Only allow tokens (with chainId) as resolver
  const handleResolverChange = (option: Option | undefined) => {
    if (option && !option.chainId) {
      toast.error("Please select a blockchain token as resolver (not fiat)");
      setResolver(undefined);
      return;
    }
    setResolver(option);
  };

  return (
    <div className="fixed inset-0 z-50 h-screen w-screen">
      <div
        className="fixed inset-0 bg-black/80 brightness-50"
        onClick={onClose}
      />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[550px] max-h-[90vh] overflow-auto">
        <div className="relative z-10 rounded-[20px] bg-black p-6 border border-white/20">
          {/* Progress indicator */}
          <div className="flex gap-1.5 mb-6">
            {([1, 2, 3] as const).map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full ${
                  step >= s ? "bg-[#53E45E]" : "bg-white/20"
                }`}
              />
            ))}
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: What's the expense? — Name + Currency */}
            {step === 1 && (
              <>
                <h2 className="text-2xl font-medium text-white mb-2">
                  What&apos;s the expense?
                </h2>
                <div>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g. Dinner, Airbnb, Groceries..."
                    className="w-full h-12 px-4 rounded-xl bg-[#17171A] text-white border border-white/10 focus:outline-none focus:ring-1 focus:ring-white/20 placeholder:text-white/50"
                  />
                </div>
                <div>
                  <label className="text-white/60 text-xs font-medium uppercase tracking-wider block mb-2">
                    Currency
                  </label>
                  <CurrencyDropdown
                    selectedCurrencies={
                      formData.currency ? [formData.currency] : []
                    }
                    setSelectedCurrencies={handleCurrencySelect}
                    showFiatCurrencies={true}
                    disableChainCurrencies={false}
                    mode="single"
                    placeholder="Select currency..."
                  />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <Button
                    type="button"
                    onClick={onClose}
                    variant="ghost"
                    className="text-white/80 hover:text-white hover:bg-white/10"
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={!canProceedStep1}
                    className="rounded-full bg-white/15 text-white hover:bg-white/25 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Continue →
                  </Button>
                </div>
              </>
            )}

            {/* Step 2: Amount & who paid — Amount + Paid by + Lock-in (crypto only) */}
            {step === 2 && (
              <>
                <h2 className="text-2xl font-medium text-white mb-2">
                  Amount & who paid
                </h2>
                <div>
                  <div className="relative flex items-center rounded-xl bg-[#17171A] border border-white/10 overflow-hidden">
                    <span className="pl-4 text-[#53E45E] font-medium">
                      {getCurrencySymbol(formData.currency)}{" "}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          amount: e.target.value,
                        }))
                      }
                      placeholder="0.00"
                      className="flex-1 h-14 px-2 bg-transparent text-[#53E45E] font-medium text-lg focus:outline-none focus:ring-0 placeholder:text-[#53E45E]/60"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-white/60 text-xs font-medium uppercase tracking-wider block mb-2">
                    Paid by
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {members.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            paidBy: member.id,
                          }))
                        }
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors ${
                          formData.paidBy === member.id
                            ? "border-[#53E45E] bg-[#53E45E]/10 text-white"
                            : "border-white/20 bg-[#17171A] text-white hover:border-white/30"
                        }`}
                      >
                        <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-medium text-white">
                          {member.id === user?.id
                            ? "Y"
                            : (member.name || "?")
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                        </div>
                        <span>
                          {member.id === user?.id ? "You" : member.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                {isCrypto && (
                  <div className="pt-2">
                    <TimeLockToggle
                      value={formData.timeLockIn}
                      onChange={(val) =>
                        setFormData((prev) => ({ ...prev, timeLockIn: val }))
                      }
                      label="Lock exchange rate (Fix the value at current exchange rate)"
                    />
                  </div>
                )}
                <div className="flex justify-between items-center pt-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={onClose}
                      variant="ghost"
                      className="text-white/80 hover:text-white hover:bg-white/10"
                    >
                      Close
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setStep(1)}
                      variant="ghost"
                      className="text-white/80 hover:text-white hover:bg-white/10"
                    >
                      ← Back
                    </Button>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={!canProceedStep2}
                    className="rounded-full bg-white/15 text-white hover:bg-white/25 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Continue →
                  </Button>
                </div>
              </>
            )}

            {/* Step 3: How to split */}
            {step === 3 && (
              <>
                <h2 className="text-2xl font-medium text-white mb-2">
                  How to split
                </h2>
                <div className="flex gap-2">
                  {(["equal", "custom", "percentage"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          splitType: type,
                        }))
                      }
                      className={`flex-1 py-2.5 px-3 rounded-xl border font-medium capitalize ${
                        formData.splitType === type
                          ? "border-[#53E45E] bg-[#53E45E]/10 text-white"
                          : "border-white/20 bg-[#17171A] text-white hover:border-white/30"
                      }`}
                    >
                      {type === "equal"
                        ? "Equal"
                        : type === "percentage"
                          ? "Percentage"
                          : "Custom"}
                    </button>
                  ))}
                </div>
                {/* Member splits list */}
                <div className="max-h-[200px] overflow-y-auto space-y-4 pr-2 mt-4">
              {members.map((member) => {
                const split = splits.find((s) => s.address === member.id);
                const amount = split?.amount || 0;
                const percentage = percentages[member.id] || 0;
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 overflow-hidden rounded-full">
                        <Image
                          src={
                            member.image ||
                            `https://api.dicebear.com/9.x/identicon/svg?seed=${member.id}`
                          }
                          alt={member.name || "User"}
                          width={40}
                          height={40}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `https://api.dicebear.com/9.x/identicon/svg?seed=${member.id}`;
                          }}
                        />
                      </div>
                      <span className="text-white">
                        {member.id === user?.id ? "You" : member.name}
                      </span>
                    </div>

                    {formData.splitType === "custom" ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={amount || ""}
                          onChange={(e) =>
                            updateCustomSplit(member.id, Number(e.target.value))
                          }
                          className="w-20 h-8 px-2 rounded-lg bg-[#17171A] text-white border border-white/20 focus:outline-none focus:ring-1 focus:ring-white/40"
                          placeholder="0.00"
                        />
                        <span className="text-white/70 text-sm">
                          {formData.currency}
                        </span>
                      </div>
                    ) : formData.splitType === "percentage" ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={percentage || ""}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            if (value >= 0 && value <= 100) {
                              updatePercentage(member.id, value);
                            }
                          }}
                          className="w-16 h-8 px-2 rounded-lg bg-[#17171A] text-white border border-white/20 focus:outline-none focus:ring-1 focus:ring-white/40"
                          placeholder="0"
                        />
                        <span className="text-white/70 text-sm">%</span>
                        <span className="text-white/70 text-sm ml-1">
                          ({formatCurrency(amount, formData.currency)})
                        </span>
                      </div>
                    ) : (
                      <div className="bg-[#17171A] rounded-lg px-3 py-1 min-w-[60px] text-[#53E45E] font-medium">
                        {formatCurrency(amount, formData.currency)}
                      </div>
                    )}
                  </div>
                );
              })}

                {/* Total summary for custom and percentage splits */}
              {(formData.splitType === "custom" ||
                formData.splitType === "percentage") && (
                <div className="flex justify-between items-center mt-4 border-t border-white/10 pt-3">
                  <span className="text-white">Total Split</span>
                  <div className="flex items-center">
                    <span
                      className={`text-white ${
                        validateSplits() ? "" : "text-red-500"
                      }`}
                    >
                      {formatCurrency(
                        splits.reduce(
                          (sum, split) => sum + (split.amount || 0),
                          0
                        ),
                        formData.currency
                      )}{" "}
                      /{" "}
                      {formatCurrency(
                        Number(formData.amount),
                        formData.currency
                      )}
                    </span>

                    {formData.splitType === "percentage" && (
                      <span
                        className={`ml-3 text-sm ${
                          Math.abs(
                            Object.values(percentages).reduce(
                              (sum, p) => sum + p,
                              0
                            ) - 100
                          ) < 0.01
                            ? "text-green-500"
                            : "text-red-500"
                        }`}
                      >
                        (
                        {Object.values(percentages)
                          .reduce((sum, p) => sum + p, 0)
                          .toFixed(0)}
                        %)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Quick actions for distribution */}
              {(formData.splitType === "custom" ||
                formData.splitType === "percentage") && (
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (formData.splitType === "custom") {
                        // Distribute equally
                        const equalAmount =
                          Number(formData.amount) / members.length;
                        members.forEach((member) => {
                          updateCustomSplit(member.id, equalAmount);
                        });
                      } else {
                        // Reset to equal percentages
                        const equalPercentage = 100 / members.length;
                        members.forEach((member) => {
                          updatePercentage(member.id, equalPercentage);
                        });
                      }
                    }}
                    className="text-xs text-white/70 px-2 py-1 bg-[#17171A] rounded hover:bg-[#252525] transition-colors"
                  >
                    Equal
                  </button>
                  {formData.paidBy && (
                    <button
                      type="button"
                      onClick={() => {
                        if (formData.splitType === "custom") {
                          // Paid by one, rest split the amount
                          const otherMembers = members.filter(
                            (m) => m.id !== formData.paidBy
                          );
                          const equalAmount =
                            Number(formData.amount) / otherMembers.length;

                          members.forEach((member) => {
                            if (member.id === formData.paidBy) {
                              updateCustomSplit(member.id, 0);
                            } else {
                              updateCustomSplit(member.id, equalAmount);
                            }
                          });
                        } else {
                          // Percentage version
                          const otherMembers = members.filter(
                            (m) => m.id !== formData.paidBy
                          );
                          const equalPercentage = 100 / otherMembers.length;

                          members.forEach((member) => {
                            if (member.id === formData.paidBy) {
                              updatePercentage(member.id, 0);
                            } else {
                              updatePercentage(member.id, equalPercentage);
                            }
                          });
                        }
                      }}
                      className="text-xs text-white/70 px-2 py-1 bg-[#17171A] rounded hover:bg-[#252525] transition-colors"
                    >
                      Paid by{" "}
                      {formData.paidBy === user?.id
                        ? "you"
                        : getPaidByUserName(formData.paidBy)}
                    </button>
                  )}
                </div>
              )}
                </div>

                <div>
                  <label className="text-white/60 text-xs font-medium uppercase tracking-wider block mb-2">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="What's this expense for?"
                    className="w-full h-12 px-4 rounded-xl bg-[#17171A] text-white border border-white/10 focus:outline-none focus:ring-1 focus:ring-white/20 placeholder:text-white/50"
                  />
                </div>

                <div>
                  <label className="text-white mb-2 block text-base font-semibold">
                    Settle in
                  </label>
                  <ResolverSelector
                    value={resolver}
                    onChange={handleResolverChange}
                  />
                </div>

                <div className="flex justify-between items-center pt-4">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={onClose}
                      variant="ghost"
                      className="text-white/80 hover:text-white hover:bg-white/10"
                    >
                      Close
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setStep(2)}
                      variant="ghost"
                      className="text-white/80 hover:text-white hover:bg-white/10"
                    >
                      ← Back
                    </Button>
                  </div>
                  <Button
                    type="submit"
                    className="rounded-full bg-[#53E45E] text-white font-medium hover:bg-[#53E45E]/90 px-6 disabled:opacity-50"
                    disabled={expenseMutation.isPending || !validateSplits()}
                  >
                    {expenseMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Expense"
                    )}
                  </Button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
