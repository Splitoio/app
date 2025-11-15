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
import { X } from "lucide-react";
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
    fetch(`${API_URL}/api/multichain/all-chains-tokens`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data: any) => {
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
      });
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
      name: formData.description || "Expense",
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
          <h2 className="text-2xl font-medium text-white mb-6">Add Expense</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-white mb-2 block">Split Amount</label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                  placeholder={getCurrencyPlaceholder(formData.currency)}
                  className="w-full h-12 px-4 rounded-lg bg-[#17171A] text-white border-none focus:outline-none focus:ring-1 focus:ring-white/20"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-white mb-2 block">Spent in </label>
              {formData.currencyType === "FIAT" ? (
                <CurrencyDropdown
                  selectedCurrencies={
                    formData.currency ? [formData.currency] : []
                  }
                  setSelectedCurrencies={(currencies) => {
                    setFormData((prev) => ({
                      ...prev,
                      currency: currencies[0] || "",
                    }));
                  }}
                  showFiatCurrencies={true}
                />
              ) : (
                <Select
                  value={formData.currency}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      currency: value,
                    }))
                  }
                >
                  <SelectTrigger className="w-full h-12 bg-[#17171A] text-white border-none focus:ring-1 focus:ring-white/20">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#17171A] border-white/10">
                    {isLoadingAll ? (
                      <SelectItem value="loading">Loading...</SelectItem>
                    ) : (
                      (() => {
                        const tokens =
                          allCurrencies?.currencies?.filter(
                            (c) =>
                              c.type === "token" &&
                              c.chainId === formData.chainId
                          ) || [];
                        return tokens.length > 0 ? (
                          tokens.map((token) => (
                            <SelectItem key={token.id} value={token.id}>
                              {token.symbol} - {token.name}
                            </SelectItem>
                          ))
                        ) : (
                          <span className="block px-4 py-2 text-white/60">
                            No tokens found
                          </span>
                        );
                      })()
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Time Lock-In toggle */}
            <TimeLockToggle
              value={formData.timeLockIn}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, timeLockIn: val }))
              }
              label="Lock exchange rate (Fix the value at current exchange rate)"
            />

            <div>
              <label className="text-white mb-2 block">Who Paid</label>
              <Select
                value={formData.paidBy}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    paidBy: value,
                  }))
                }
              >
                <SelectTrigger className="w-full h-12 bg-[#17171A] text-white border-none focus:ring-1 focus:ring-white/20">
                  <SelectValue placeholder="Select who paid" />
                </SelectTrigger>
                <SelectContent className="bg-[#17171A] border-white/10">
                  {members.map((member) => (
                    <SelectItem
                      key={member.id}
                      value={member.id}
                      className="text-white hover:bg-white/10"
                    >
                      {member.id === user?.id ? "You" : member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-white mb-2 block">Choose Split Type</label>
              <Select
                value={formData.splitType}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    splitType: value,
                  }))
                }
              >
                <SelectTrigger className="w-full h-12 bg-[#17171A] text-white border-none focus:ring-1 focus:ring-white/20">
                  <SelectValue placeholder="Select split type" />
                </SelectTrigger>
                <SelectContent className="bg-[#17171A] border-white/10">
                  <SelectItem
                    value="equal"
                    className="text-white hover:bg-white/10"
                  >
                    Equal Split
                  </SelectItem>
                  <SelectItem
                    value="percentage"
                    className="text-white hover:bg-white/10"
                  >
                    Percentage Split
                  </SelectItem>
                  <SelectItem
                    value="custom"
                    className="text-white hover:bg-white/10"
                  >
                    Custom Split
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Member splits list */}
            <div className="max-h-[200px] overflow-y-auto space-y-4 pr-2">
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
                      <div className="bg-[#17171A] rounded-lg px-3 py-1 min-w-[60px] text-white">
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
              <label className="text-white mb-2 block">Description</label>
              <div className="relative">
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
                  className="w-full h-12 px-4 rounded-lg bg-[#17171A] text-white border-none focus:outline-none focus:ring-1 focus:ring-white/20"
                  required
                />
              </div>
            </div>

            {/* Resolver Selector */}
            <div>
              <label className="text-white mb-2 block text-base font-semibold">
                Settle in
              </label>
              <ResolverSelector
                value={resolver}
                onChange={handleResolverChange}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-full bg-white text-black font-medium hover:bg-white/90 transition-colors mt-6"
              disabled={expenseMutation.isPending}
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
          </form>
        </div>
      </div>
    </div>
  );
}
