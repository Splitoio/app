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
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/constants";
import Image from "next/image";

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
  paidBy: string;
}

// Define an interface for the expense payload
interface ExpensePayload {
  category: string;
  name: string;
  participants: { userId: string; amount: number }[];
  splitType: string;
  amount: number;
  currency: string;
  paidBy: string;
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

  const [formData, setFormData] = useState<ExpenseFormData>({
    name: "",
    description: "",
    amount: "",
    splitType: "equal",
    currency: "USD",
    paidBy: user?.id || "",
  });

  const [lockPrice, setLockPrice] = useState(true);
  const [splits, setSplits] = useState<Split[]>([]);
  const [percentages, setPercentages] = useState<{ [key: string]: number }>({});
  const expenseMutation = useCreateExpense(groupId);

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

    if (!isAuthenticated) {
      toast.error("Please sign in first!");
      return;
    }

    const memberIds = members.map((m) => m.id);
    if (!formData.amount || Number(formData.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // Description is now optional
    const description = formData.description.trim() || "Expense";

    // Validate that custom or percentage splits add up correctly
    if (
      (formData.splitType === "custom" ||
        formData.splitType === "percentage") &&
      !validateSplits()
    ) {
      toast.error("Split amounts must add up to the total expense amount");
      return;
    }

    let shares: number[] = [];
    let splitType = "EQUAL";

    switch (formData.splitType) {
      case "equal":
        // For equal split, each member gets equal amount
        const equalAmount = Number(formData.amount) / members.length;
        shares = members.map((_, index) =>
          index === members.length - 1
            ? Number(formData.amount) - equalAmount * (members.length - 1) // Last member gets remaining to ensure total matches
            : equalAmount
        );
        splitType = "EQUAL";
        break;

      case "percentage":
        // Convert percentages to actual amounts
        shares = members.map((member) => {
          const percentage = percentages[member.id] || 0;
          return (percentage / 100) * Number(formData.amount);
        });
        splitType = "PERCENTAGE";
        break;

      case "custom":
        // Use the exact amounts from splits
        shares = splits.map((split) => split.amount);
        splitType = "EXACT";
        break;
    }

    expenseMutation.mutate(
      {
        category: "OTHER",
        name: description,
        participants: memberIds.map((id, index) => ({
          userId: id,
          amount: shares[index],
        })),
        splitType: splitType,
        amount: Number(formData.amount),
        currency: formData.currency,
        paidBy: formData.paidBy || user?.id || "",
      } as ExpensePayload,
      {
        onSuccess: () => {
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
      }
    );
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
                  placeholder="$50"
                  className="w-full h-12 px-4 rounded-lg bg-[#17171A] text-white border-none focus:outline-none focus:ring-1 focus:ring-white/20"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-white mb-2 block">
                Choose Payment Token
              </label>
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
                  <SelectItem
                    value="USDT"
                    className="text-white hover:bg-white/10"
                  >
                    USDT
                  </SelectItem>
                  <SelectItem
                    value="USD"
                    className="text-white hover:bg-white/10"
                  >
                    USD
                  </SelectItem>
                  <SelectItem
                    value="XLM"
                    className="text-white hover:bg-white/10"
                  >
                    XLM
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Lock price toggle */}
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-white/70">
                  Lock price at $1 = 1 USDT
                </span>
                <div
                  className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${
                    lockPrice ? "bg-white/30" : "bg-[#333]"
                  }`}
                  onClick={() => setLockPrice(!lockPrice)}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transform transition-transform ${
                      lockPrice ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </div>
              </div>
            </div>

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
                          (${amount.toFixed(2)})
                        </span>
                      </div>
                    ) : (
                      <div className="bg-[#17171A] rounded-lg px-3 py-1 min-w-[60px] text-white">
                        ${amount.toFixed(2)}
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
                      $
                      {splits
                        .reduce((sum, split) => sum + (split.amount || 0), 0)
                        .toFixed(2)}{" "}
                      / ${Number(formData.amount).toFixed(2)}
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

            <input
              type="text"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="What's this for?"
              className="w-full h-12 px-4 mt-4 rounded-lg bg-[#17171A] text-white border-none focus:outline-none focus:ring-1 focus:ring-white/20"
            />

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
