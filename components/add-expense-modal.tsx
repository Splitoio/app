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
import { User } from "@/api/modelSchema";
import { useCreateExpense } from "@/features/expenses/hooks/use-create-expense";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/constants";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: User[];
  groupId: string;
}

export function AddExpenseModal({
  isOpen,
  onClose,
  members,
  groupId,
}: AddExpenseModalProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    amount: "",
    splitType: "equal",
    currency: "USD",
  });

  const [splits, setSplits] = useState<Split[]>([]);
  const [percentages, setPercentages] = useState<{ [key: string]: number }>({});
  const expenseMutation = useCreateExpense(groupId);

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

    if (!formData.description.trim()) {
      toast.error("Please enter a description");
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
        name: formData.description,
        participants: memberIds.map((id, index) => ({
          userId: id,
          amount: shares[index],
        })),
        splitType: splitType,
        amount: Number(formData.amount),
        currency: formData.currency,
      },
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

  return (
    <div className="fixed inset-0 z-50 h-screen w-screen">
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[450px]">
        <div className="animate-border-light">
          <div className="relative rounded-[14.77px] bg-black p-4 lg:p-8">
            <div className="flex items-center justify-between mb-6 lg:mb-8">
              <h2 className="text-2xl lg:text-[29.28px] font-base text-white tracking-[-0.03em] font-instrument-sans">
                Add Expense
              </h2>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 lg:p-2 hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
              </button>
            </div>

            <div className="space-y-4 lg:space-y-6">
              <div>
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
                    {/* <div>
                      <Label htmlFor="members" className="text-white">
                        Members (Email Addresses)
                      </Label>
                      <Textarea
                        id="members"
                        value={formData.members}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            members: e.target.value,
                          }))
                        }
                        placeholder="Enter email addresses separated by commas"
                        rows={3}
                        className="mt-2 bg-zinc-900 border-white/10 text-white placeholder:text-white/50"
                        required
                      />
                    </div> */}

                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="amount" className="text-white">
                            Amount
                          </Label>
                          <div className="relative mt-2">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none select-none">
                              {formData.currency === "USD" ? "$" : ""}
                            </span>
                            <Input
                              type="number"
                              id="amount"
                              value={formData.amount}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  amount: e.target.value,
                                }))
                              }
                              className="pl-8 bg-zinc-900 border-white/10 text-white"
                              placeholder="0.00"
                              required
                              disabled={expenseMutation.isPending}
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="currency" className="text-white">
                            Currency
                          </Label>
                          <Select
                            value={formData.currency}
                            onValueChange={(value) =>
                              setFormData((prev) => ({
                                ...prev,
                                currency: value,
                              }))
                            }
                          >
                            <SelectTrigger className="mt-2 bg-zinc-900 border-white/10 text-white">
                              <SelectValue
                                placeholder="Select currency"
                                className="text-white/70"
                              />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white/10">
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
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="amount" className="text-white">
                          Note
                        </Label>
                        <div className="relative mt-2">
                          <Input
                            type="text"
                            id="description"
                            value={formData.description}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                description: e.target.value,
                              }))
                            }
                            className="bg-zinc-900 border-white/10 text-white"
                            placeholder="Enter split description"
                            disabled={expenseMutation.isPending}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="splitType" className="text-white">
                          Split Type
                        </Label>
                        <Select
                          value={formData.splitType}
                          onValueChange={(value) =>
                            setFormData((prev) => ({
                              ...prev,
                              splitType: value,
                            }))
                          }
                        >
                          <SelectTrigger className="mt-2 bg-zinc-900 border-white/10 text-white">
                            <SelectValue
                              placeholder="Select split type"
                              className="text-white/70"
                            />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-white/10">
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

                      {/* <div>
                        <Label htmlFor="paidBy" className="text-white">Paid By</Label>
                        <Select
                          value={formData.paidBy || address || ""}
                          onValueChange={(value) =>
                            setFormData((prev) => ({ ...prev, paidBy: value }))
                          }
                        >
                          <SelectTrigger className="mt-2 bg-zinc-900 border-white/10 text-white">
                            <SelectValue
                              placeholder="Select who paid"
                              className="text-white/70"
                            />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-white/10">
                            {address && (
                              <SelectItem
                                value={address}
                                className="text-white hover:bg-white/10"
                              >
                                You
                              </SelectItem>
                            )}
                            {formData.members.split(",").map(
                              (member) =>
                                member.trim() && (
                                  <SelectItem
                                    key={member.trim()}
                                    value={member.trim()}
                                    className="text-white hover:bg-white/10"
                                  >
                                    {member.trim()}
                                  </SelectItem>
                                )
                            )}
                          </SelectContent>
                        </Select>
                      </div> */}
                    </div>
                  </div>

                  {formData.splitType !== "percentage" && (
                    <div className="mt-6 space-y-4">
                      {members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-4"
                        >
                          <span className="text-sm text-muted-foreground w-40 truncate">
                            {member.name}
                          </span>
                          <Input
                            disabled={formData.splitType === "equal"}
                            type="number"
                            value={
                              splits.find((s) => s.address === member.id)
                                ?.amount
                            }
                            onChange={(e) =>
                              updateCustomSplit(
                                member.id,
                                Number(e.target.value)
                              )
                            }
                            className="w-32 text-white"
                            placeholder="Amount"
                          />
                          <span className="text-sm text-muted-foreground">
                            {formData.currency}
                          </span>
                        </div>
                      ))}
                      <div className="mt-2 text-sm text-muted-foreground">
                        Total:{" "}
                        {splits.reduce((sum, split) => sum + split.amount, 0)}{" "}
                        {formData.currency}
                        {Math.abs(
                          splits.reduce((sum, split) => sum + split.amount, 0) -
                            Number(formData.amount)
                        ) > 0.01 && (
                          <span className="text-destructive ml-2">
                            (Must equal total amount: {formData.amount}{" "}
                            {formData.currency})
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {formData.splitType === "percentage" && (
                    <div className="mt-6 space-y-4">
                      {members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-4"
                        >
                          <span className="text-sm text-muted-foreground w-40 truncate">
                            {member.name}
                          </span>
                          <Input
                            type="number"
                            value={percentages[member.id] || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (/^\d*$/.test(value) && Number(value) <= 100) {
                                updatePercentage(member.id, Number(value));
                              }
                            }}
                            className="w-32 bg-[#1F1F23] text-white/90"
                            placeholder="Percentage"
                          />
                          <span className="text-sm text-muted-foreground">
                            %
                          </span>
                        </div>
                      ))}
                      <div className="mt-2 text-sm text-muted-foreground">
                        Total:{" "}
                        {Object.values(percentages).reduce(
                          (sum, p) => sum + p,
                          0
                        )}
                        %
                        {Math.abs(
                          Object.values(percentages).reduce(
                            (sum, p) => sum + p,
                            0
                          ) - 100
                        ) > 0.01 && (
                          <span className="text-destructive ml-2">
                            (Must equal 100%)
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 pt-4">
                    <Button
                      type="submit"
                      className="flex-1 bg-zinc-900 text-white hover:bg-zinc-800"
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
                    <Button
                      type="button"
                      onClick={onClose}
                      variant="outline"
                      className="flex-1 border-white/10 text-white bg-zinc-900 hover:bg-zinc-800"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
