"use client";

import type React from "react";
import { useGroups, type Split, type Debt } from "@/stores/groups";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { User } from "@/api-helpers/modelSchema";
import { useCreateExpense } from "@/features/expenses/hooks/use-create-expense";
import type { CreateExpenseParams } from "@/features/expenses/hooks/use-create-expense";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/constants";
import {
  useGetAllCurrencies,
  useGetFiatCurrencies,
} from "@/features/currencies/hooks/use-currencies";
import { CurrencyType } from "@/api-helpers/types";
import ResolverSelector from "./ResolverSelector";
import axios from "axios";
import CurrencyDropdown from "./currency-dropdown";
import TimeLockToggle from "./ui/TimeLockToggle";
import { motion, AnimatePresence } from "framer-motion";
import { fadeIn, scaleIn } from "@/utils/animations";
import { Card, A, T, getUserColor } from "@/lib/splito-design";
import { useGroupLayout } from "@/contexts/group-layout-context";

const CATEGORY_OPTIONS: { emoji: string; api: string }[] = [
  { emoji: "🍽", api: "FOOD" },
  { emoji: "🏠", api: "ACCOMMODATION" },
  { emoji: "🚗", api: "TRAVEL" },
  { emoji: "✈️", api: "TRAVEL" },
  { emoji: "🛒", api: "OTHER" },
  { emoji: "🎟", api: "OTHER" },
  { emoji: "🎵", api: "OTHER" },
  { emoji: "💊", api: "OTHER" },
  { emoji: "🏄", api: "OTHER" },
  { emoji: "⚡️", api: "OTHER" },
];

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
  category: string;
  /** Emoji of the selected category (so only one icon is highlighted when multiple share the same api) */
  categoryEmoji: string;
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

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [formData, setFormData] = useState<ExpenseFormData>({
    name: "",
    description: "",
    amount: "",
    splitType: "equal",
    currency: "USD",
    currencyType: "FIAT",
    timeLockIn: false,
    paidBy: user?.id || "",
    category: "OTHER",
    categoryEmoji: CATEGORY_OPTIONS[4].emoji, // 🛒 first "OTHER" option
  });

  const [lockPrice, setLockPrice] = useState(true);
  const [splits, setSplits] = useState<Split[]>([]);
  const [percentages, setPercentages] = useState<{ [key: string]: number }>({});
  const expenseMutation = useCreateExpense(groupId);

  const group = useGroupLayout().group;
  const groupName = group?.name ?? "Group";

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

    const payload: ExpensePayload = {
      category: formData.categoryEmoji || formData.category || "OTHER",
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
  const canProceedStep1 = formData.name.trim() !== "";
  const canProceedStep2 = formData.currency !== "";
  const canProceedStep3 =
    formData.amount !== "" &&
    Number(formData.amount) > 0 &&
    formData.paidBy !== "";
  const canSubmit = validateSplits();

  // Only allow tokens (with chainId) as resolver
  const handleResolverChange = (option: Option | undefined) => {
    if (option && !option.chainId) {
      toast.error("Please select a blockchain token as resolver (not fiat)");
      setResolver(undefined);
      return;
    }
    setResolver(option);
  };

  const inp = {
    width: "100%",
    background: "rgba(255,255,255,0.05)",
    border: "1.5px solid rgba(255,255,255,0.09)",
    borderRadius: 14,
    padding: "12px 16px",
    color: "#fff",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box" as const,
    fontFamily: "inherit",
  };
  const lbl = {
    color: T.label,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    marginBottom: 8,
    display: "block",
  };
  const StepBackBtn = ({ onClick }: { onClick: () => void }) => {
  return (
      <button
        type="button"
        onClick={onClick}
        style={{
          flex: 1,
          padding: 13,
          background: "rgba(255,255,255,0.05)",
          color: T.body,
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 14,
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        ← Back
      </button>
    );
  };
  const PrimaryBtn = ({
    children,
    onClick,
    disabled = false,
    style = {},
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    style?: React.CSSProperties;
  }) => {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        style={{
          flex: 2,
          padding: 13,
          background: disabled ? "rgba(255,255,255,0.05)" : A,
          color: disabled ? "#555" : "#0a0a0a",
          border: "none",
          borderRadius: 14,
          fontSize: 14,
          fontWeight: 800,
          cursor: disabled ? "default" : "pointer",
          fontFamily: "inherit",
          transition: "all 0.2s",
          ...style,
        }}
      >
        {children}
      </button>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 h-screen w-screen"
          {...fadeIn}
        >
          <motion.div
            className="fixed inset-0 bg-black/70 brightness-50"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[460px] px-6">
            <motion.div
              onClick={(e) => e.stopPropagation()}
              {...scaleIn}
              style={{
                background: "linear-gradient(160deg, #141414 0%, #0f0f0f 100%)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 28,
                width: "100%",
                maxWidth: 460,
                padding: "28px 28px 32px",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 40px 100px rgba(0,0,0,0.8)",
              }}
            >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <div>
            <p
              style={{
                color: "#fff",
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: "-0.02em",
              }}
            >
              Add Expense
            </p>
            <p style={{ color: T.mid, fontSize: 12, marginTop: 3 }}>{groupName}</p>
            <div style={{ display: "flex", gap: 5, marginTop: 12 }}>
              {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                  style={{
                    height: 3,
                    width: 26,
                    borderRadius: 99,
                    background: step >= s ? A : "#2a2a2a",
                    transition: "background 0.3s",
                    boxShadow: step >= s ? `0 0 8px ${A}88` : "none",
                  }}
              />
            ))}
          </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: T.soft,
              width: 34,
              height: 34,
              borderRadius: "50%",
              cursor: "pointer",
              fontSize: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Description + Category */}
            {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                <label style={lbl}>Description</label>
                  <input
                  placeholder="e.g. Dinner, Hotel, Taxi…"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                  style={inp}
                  autoFocus
                  />
                </div>
                <div>
                <label style={lbl}>Category</label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: 8,
                  }}
                >
                  {CATEGORY_OPTIONS.map(({ emoji, api }) => {
                    const sel = formData.categoryEmoji === emoji;
                    return (
                      <button
                        key={emoji + api}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            category: api,
                            categoryEmoji: emoji,
                          }))
                        }
                        style={{
                          background: sel ? `${A}15` : "rgba(255,255,255,0.04)",
                          border: `1.5px solid ${sel ? A + "44" : "rgba(255,255,255,0.08)"}`,
                          borderRadius: 14,
                          padding: "12px 0",
                          fontSize: 20,
                          cursor: "pointer",
                          transition: "all 0.2s",
                          boxShadow: sel ? `0 0 12px ${A}22` : "none",
                        }}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
              </div>
              <PrimaryBtn
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
                style={{ flex: "none" }}
              >
                {canProceedStep1 ? "Continue →" : "Enter a description"}
              </PrimaryBtn>
            </div>
          )}

          {/* Step 2: Spent in (currency) */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 14,
                  padding: "14px 16px",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <p
                  style={{
                    color: T.mid,
                    fontSize: 12,
                    marginBottom: 2,
                    fontWeight: 600,
                  }}
                >
                  Group default
                </p>
                <p
                  style={{
                    color: T.body,
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {formData.currency || "USD"}{" "}
                  <span style={{ color: T.sub, fontWeight: 400 }}>
                    — change below if needed
                  </span>
                </p>
              </div>
              <div>
                <label style={lbl}>Spent in</label>
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
              {formData.currencyType === "FIAT" && formData.currency && (
                <div
                  style={{
                    background: "rgba(52,211,153,0.06)",
                    border: "1px solid rgba(52,211,153,0.15)",
                    borderRadius: 14,
                    padding: "12px 16px",
                    display: "flex",
                    gap: 10,
                  }}
                >
                  <span style={{ color: "#34D399", fontSize: 14 }}>ℹ</span>
                  <p
                    style={{
                      color: "#34D399aa",
                      fontSize: 12,
                      lineHeight: 1.6,
                    }}
                  >
                    Fiat amounts will be converted to the group&apos;s settlement
                    currency at time of settling.
                  </p>
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <StepBackBtn onClick={() => setStep(1)} />
                <PrimaryBtn onClick={() => setStep(3)}>Continue →</PrimaryBtn>
              </div>
            </div>
          )}

          {/* Step 3: Amount + Paid by */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                <label style={lbl}>
                  Amount{" "}
                  <span style={{ color: A }}>({formData.currency || "USD"})</span>
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    background: "rgba(255,255,255,0.05)",
                    border: "1.5px solid rgba(255,255,255,0.09)",
                    borderRadius: 14,
                    padding: "14px 16px",
                  }}
                >
                  <span
                    style={{
                      color: A,
                      fontSize: 20,
                      fontWeight: 800,
                      marginRight: 10,
                      minWidth: 24,
                    }}
                  >
                    {getCurrencySymbol(formData.currency)}
                    </span>
                    <input
                      type="number"
                    placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          amount: e.target.value,
                        }))
                      }
                    style={{
                      background: "none",
                      border: "none",
                      color: "#fff",
                      fontSize: 26,
                      fontWeight: 800,
                      outline: "none",
                      width: "100%",
                      fontFamily: "inherit",
                    }}
                    autoFocus
                    />
                  </div>
                </div>
                <div>
                <label style={lbl}>PAID BY</label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${Math.min(members.length, 4)}, 1fr)`,
                    gap: 8,
                  }}
                >
                  {members.map((member) => {
                    const init =
                      member.id === user?.id
                        ? "Y"
                        : (member.name || "?")
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase();
                    const isSelected = formData.paidBy === member.id;
                    const memberColor = getUserColor(member.id === user?.id ? (user?.name || member.name) : member.name);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, paidBy: member.id }))
                        }
                        style={{
                          padding: "10px 4px",
                          background: isSelected ? `${memberColor}12` : "rgba(255,255,255,0.04)",
                          border: isSelected
                            ? `2px solid ${memberColor}`
                            : "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 14,
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 6,
                          transition: "all 0.2s",
                          boxShadow: isSelected ? `0 0 14px ${memberColor}44` : "none",
                        }}
                      >
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: "50%",
                            background: isSelected ? memberColor : `${memberColor}1a`,
                            border: isSelected ? "none" : `2px solid ${memberColor}40`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            fontWeight: 800,
                            color: isSelected ? "#0a0a0a" : memberColor,
                          }}
                        >
                          {init}
                        </div>
                        <span
                          style={{
                            color: isSelected ? memberColor : T.sub,
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          {member.id === user?.id
                            ? "You"
                            : (member.name || "?").split(" ")[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
                </div>
              <div style={{ display: "flex", gap: 8 }}>
                <StepBackBtn onClick={() => setStep(2)} />
                <PrimaryBtn
                  onClick={() => setStep(4)}
                  disabled={!canProceedStep3}
                  >
                    Continue →
                </PrimaryBtn>
                </div>
            </div>
          )}

          {/* Step 4: Split method + participants (excluding payer) + Lock In + submit */}
          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={lbl}>SPLIT METHOD</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["equal", "custom", "percentage"] as const).map((type) => {
                    const sel = formData.splitType === type;
                    const label =
                      type === "equal"
                        ? "Equal"
                        : type === "custom"
                          ? "Custom"
                          : "Percentage";
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, splitType: type }))
                        }
                        style={{
                          flex: 1,
                          padding: "10px 4px",
                          background: sel ? `${A}14` : "rgba(255,255,255,0.04)",
                          border: `1.5px solid ${sel ? A + "44" : "rgba(255,255,255,0.08)"}`,
                          borderRadius: 14,
                          color: sel ? A : T.muted,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          transition: "all 0.2s",
                          fontFamily: "inherit",
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label style={lbl}>Participants</label>
                <Card
                  style={{
                    padding: 0,
                    overflow: "hidden",
                    background: "linear-gradient(145deg, #111 0%, #0d0d0d 100%)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
                  }}
                >
                  <div
                    style={{
                      maxHeight: 240,
                      overflowY: "auto",
                    }}
                  >
                    {members
                      .filter((m) => m.id !== formData.paidBy)
                      .map((member, index) => {
                        const split = splits.find((s) => s.address === member.id);
                        const amount = split?.amount || 0;
                        const percentage = percentages[member.id] ?? 0;
                        const isEqual = formData.splitType === "equal";
                        const init =
                          member.id === user?.id
                            ? "Y"
                            : (member.name || "?")
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase();
                        const participantColors = ["#A78BFA", "#34D399", "#FB923C", "#F472B6", "#FBBF24", "#22D3EE"];
                        const memberColor = participantColors[index % participantColors.length];
                        const displayName =
                          member.id === user?.id
                            ? "You"
                            : (() => {
                                const parts = (member.name || "?").trim().split(/\s+/);
                                if (parts.length >= 2) {
                                  return `${parts[0]} ${parts[1][0]}.`;
                                }
                                return parts[0] || "?";
                              })();
                        return (
                          <div
                            key={member.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "14px 18px",
                              borderBottom: "1px solid rgba(255,255,255,0.06)",
                              gap: 12,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                minWidth: 0,
                                flex: 1,
                              }}
                            >
                              <div
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: "50%",
                                  background: `${memberColor}1a`,
                                  border: `2px solid ${memberColor}33`,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 11,
                                  fontWeight: 800,
                                  color: memberColor,
                                  flexShrink: 0,
                                }}
                              >
                                {init}
                              </div>
                              <span
                                style={{
                                  color: T.bright,
                                  fontSize: 13,
                                  fontWeight: 600,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {displayName}
                              </span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                flexShrink: 0,
                              }}
                            >
                              {isEqual ? (
                                <span
                                  style={{
                                    color: T.body,
                                    fontSize: 14,
                                    fontWeight: 700,
                                    fontFamily: "monospace",
                                  }}
                                >
                                  {formatCurrency(amount, formData.currency)}
                                </span>
                              ) : formData.splitType === "percentage" ? (
                                <>
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={percentage || ""}
                                    onChange={(e) => {
                                      const value = Number(e.target.value);
                                      if (value >= 0 && value <= 100) {
                                        updatePercentage(member.id, value);
                                      }
                                    }}
                                    style={{
                                      width: 52,
                                      padding: "6px 8px",
                                      background: "rgba(255,255,255,0.06)",
                                      border: "1px solid rgba(255,255,255,0.08)",
                                      borderRadius: 8,
                                      color: "#fff",
                                      fontSize: 12,
                                      textAlign: "right",
                                      outline: "none",
                                      fontFamily: "inherit",
                                    }}
                                  />
                                  <span style={{ color: T.sub, fontSize: 12, width: 16 }}>%</span>
                                </>
                              ) : (
                                <>
                                  <span
                                    style={{
                                      color: T.sub,
                                      fontSize: 12,
                                      marginRight: 2,
                                    }}
                                  >
                                    {getCurrencySymbol(formData.currency)}
                                  </span>
                                  <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={amount || ""}
                                    onChange={(e) =>
                                      updateCustomSplit(
                                        member.id,
                                        Number(e.target.value)
                                      )
                                    }
                                    style={{
                                      width: 68,
                                      padding: "6px 8px",
                                      background: "rgba(255,255,255,0.06)",
                                      border: "1px solid rgba(255,255,255,0.08)",
                                      borderRadius: 8,
                                      color: "#fff",
                                      fontSize: 13,
                                      fontWeight: 600,
                                      textAlign: "right",
                                      outline: "none",
                                      fontFamily: "inherit",
                                    }}
                                  />
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </Card>
              </div>
              {(formData.splitType === "custom" ||
                formData.splitType === "percentage") && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 0",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    gap: 8,
                  }}
                >
                  <span style={{ color: T.body, fontSize: 12, fontWeight: 600 }}>
                    Total split
                  </span>
                  <span
                    style={{
                      color: canSubmit ? A : "#ef4444",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {formatCurrency(
                      splits.reduce((sum, s) => sum + (s.amount || 0), 0),
                      formData.currency
                    )}{" "}
                    / {formatCurrency(Number(formData.amount), formData.currency)}
                    {formData.splitType === "percentage" &&
                      ` (${Object.values(percentages).reduce((a, b) => a + b, 0).toFixed(0)}%)`}
                  </span>
                </div>
              )}
              {isCrypto && (
                <div>
                  <TimeLockToggle
                    value={formData.timeLockIn}
                    onChange={(val) =>
                      setFormData((prev) => ({ ...prev, timeLockIn: val }))
                    }
                    label="Lock exchange rate (Fix the value at current exchange rate)"
                  />
                </div>
              )}
              {isCrypto && (
                <div>
                  <label style={lbl}>Settle in</label>
                  <ResolverSelector
                    value={resolver}
                    onChange={handleResolverChange}
                  />
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <StepBackBtn onClick={() => setStep(3)} />
                <button
                    type="submit"
                  disabled={!canSubmit || expenseMutation.isPending}
                  style={{
                    flex: 2,
                    padding: 13,
                    background:
                      !canSubmit || expenseMutation.isPending
                        ? "rgba(255,255,255,0.05)"
                        : A,
                    color:
                      !canSubmit || expenseMutation.isPending ? "#555" : "#0a0a0a",
                    border: "none",
                    borderRadius: 14,
                    fontSize: 14,
                    fontWeight: 800,
                    cursor:
                      canSubmit && !expenseMutation.isPending
                        ? "pointer"
                        : "default",
                    fontFamily: "inherit",
                    transition: "all 0.2s",
                  }}
                >
                  {expenseMutation.isPending ? "Adding…" : "Add Expense ✓"}
                </button>
                </div>
            </div>
            )}
          </form>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
