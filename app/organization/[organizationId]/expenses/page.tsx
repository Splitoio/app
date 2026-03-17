"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useGetExpenses, useCreateExpense, useDeleteExpense } from "@/features/expenses/hooks/use-create-expense";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";
import { Card, SectionLabel, T, A } from "@/lib/splito-design";
import { motion, AnimatePresence } from "framer-motion";
import CurrencyDropdown from "@/components/currency-dropdown";
import type { Currency } from "@/features/currencies/api/client";
import { useQueries } from "@tanstack/react-query";
import { getExchangeRate } from "@/features/currencies/api/client";
import { CURRENCY_QUERY_KEYS } from "@/features/currencies/hooks/use-currencies";

type Expense = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  expenseDate: string;
  category: string;
  paidBy?: string;
};

const CATEGORIES = [
  { label: "Business", emoji: "💼" },
  { label: "Software", emoji: "💻" },
  { label: "Hardware", emoji: "🖥️" },
  { label: "Travel", emoji: "✈️" },
  { label: "Marketing", emoji: "📣" },
  { label: "Office", emoji: "🏢" },
  { label: "Other", emoji: "🧾" },
];

function getCategoryEmoji(category: string): string {
  const match = CATEGORIES.find(
    (c) => c.label.toUpperCase() === (category || "").toUpperCase()
  );
  return match?.emoji ?? "🧾";
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function OrganizationExpensesPage() {
  const params = useParams();
  const organizationId = params?.organizationId as string;
  const { user } = useAuthStore();
  const { data, isLoading } = useGetExpenses(organizationId);
  const expenses = ((data as { expenses?: Expense[] })?.expenses ?? []) as Expense[];
  const createExpenseMutation = useCreateExpense(organizationId);
  const deleteExpenseMutation = useDeleteExpense(organizationId);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [modalOpen, setModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [form, setForm] = useState({
    name: "",
    amount: "",
    currency: user?.currency || "USD",
    category: "Business",
    expenseDate: new Date().toISOString().slice(0, 10),
  });

  // ── Currency conversion ───────────────────────────────────────
  const defaultCurrency = user?.currency || "USD";
  const uniqueCurrencies = Array.from(new Set(expenses.map((e) => e.currency))).filter(
    (c) => c !== defaultCurrency
  );
  const rateQueries = useQueries({
    queries: uniqueCurrencies.map((from) => ({
      queryKey: [CURRENCY_QUERY_KEYS.EXCHANGE_RATE, from, defaultCurrency],
      queryFn: () => getExchangeRate(from, defaultCurrency),
      staleTime: 1000 * 60 * 5,
      enabled: !!defaultCurrency && !!from,
    })),
  });
  const rateMap: Record<string, number> = { [defaultCurrency]: 1 };
  uniqueCurrencies.forEach((c, i) => {
    const rate = rateQueries[i]?.data?.rate;
    if (rate != null) rateMap[c] = rate;
  });
  const convert = (amount: number, currency: string) => amount * (rateMap[currency] ?? 1);

  // ── Aggregates ──────────────────────────────────────────────
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const totalExpenses = expenses.reduce((sum, e) => sum + convert(e.amount, e.currency), 0);
  const thisMonthExpenses = expenses
    .filter((e) => new Date(e.expenseDate) >= startOfMonth)
    .reduce((sum, e) => sum + convert(e.amount, e.currency), 0);

  // ── Handlers ─────────────────────────────────────────────────
  const closeForm = () => {
    setModalOpen(false);
    setForm({
      name: "",
      amount: "",
      currency: user?.currency || "USD",
      category: "Business",
      expenseDate: new Date().toISOString().slice(0, 10),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.name.trim() || isNaN(amount) || amount <= 0) {
      toast.error("Please enter a name and valid amount");
      return;
    }
    if (!user?.id) return;
    createExpenseMutation.mutate(
      {
        name: form.name.trim(),
        category: form.category,
        amount,
        splitType: "EXACT",
        currency: form.currency,
        currencyType: "FIAT",
        timeLockIn: false,
        participants: [{ userId: user.id, amount }],
        paidBy: user.id,
        expenseDate: form.expenseDate,
      },
      {
        onSuccess: () => {
          toast.success("Expense logged");
          closeForm();
        },
        onError: (err: Error) => toast.error(err?.message ?? "Failed to add expense"),
      }
    );
  };

  const handleDeleteConfirm = () => {
    if (!expenseToDelete) return;
    deleteExpenseMutation.mutate(expenseToDelete.id, {
      onSuccess: () => {
        toast.success("Expense deleted");
        setExpenseToDelete(null);
      },
      onError: () => {
        toast.error("Failed to delete expense");
        setExpenseToDelete(null);
      },
    });
  };

  // ── Sorted expenses ───────────────────────────────────────────
  const sorted = [...expenses].sort(
    (a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()
  );

  return (
    <div className="w-full space-y-5 sm:space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] sm:text-[22px] font-extrabold tracking-[-0.02em] text-white">
            Expenses
          </h1>
          <p className="text-[12px] font-medium mt-0.5" style={{ color: T.muted }}>
            {isLoading
              ? "Loading…"
              : `${expenses.length} expense${expenses.length !== 1 ? "s" : ""} logged`}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-xl h-10 px-4 text-[13px] font-extrabold transition-all hover:opacity-90"
          style={{ background: A, color: "#0a0a0a" }}
        >
          <Plus className="h-4 w-4" /> Add expense
        </button>
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-white/30" />
        </div>
      )}

      {/* ── Empty ── */}
      {!isLoading && expenses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p style={{ fontSize: 52, marginBottom: 16 }}>🧾</p>
          <p
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: T.body,
              marginBottom: 8,
            }}
          >
            No expenses yet
          </p>
          <p style={{ fontSize: 14, color: T.sub, marginBottom: 20 }}>
            Log business expenses like subscriptions, tools, and one-off costs.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-extrabold transition-all hover:opacity-90"
            style={{ background: A, color: "#0a0a0a" }}
          >
            <Plus className="h-4 w-4" /> Add first expense
          </button>
        </div>
      )}

      {/* ── Summary ── */}
      {!isLoading && expenses.length > 0 && (
        <>
          <div
            className="rounded-2xl sm:rounded-3xl border border-white/[0.09] p-5 sm:p-7"
            style={{
              background:
                "linear-gradient(135deg, #141414 0%, #0f0f0f 100%)",
              boxShadow:
                "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            <div className="grid grid-cols-2 gap-0">
              <div className="min-w-0 pr-4 sm:pr-6 border-r border-white/[0.07]">
                <p
                  className="text-[10px] font-semibold tracking-[0.06em] uppercase mb-1.5"
                  style={{ color: T.dim }}
                >
                  Total
                </p>
                <p
                  className="text-[22px] sm:text-[24px] font-extrabold font-mono"
                  style={{ color: "#F87171" }}
                >
                  {formatCurrency(totalExpenses, defaultCurrency)}
                </p>
              </div>
              <div className="min-w-0 pl-4 sm:pl-6">
                <p
                  className="text-[10px] font-semibold tracking-[0.06em] uppercase mb-1.5"
                  style={{ color: T.dim }}
                >
                  This month
                </p>
                <p
                  className="text-[22px] sm:text-[24px] font-extrabold font-mono"
                  style={{ color: "#22D3EE" }}
                >
                  {formatCurrency(thisMonthExpenses, defaultCurrency)}
                </p>
              </div>
            </div>
          </div>

          {/* ── Expense list ── */}
          <div>
            <SectionLabel className="mb-3">All expenses</SectionLabel>
            <Card className="p-0 overflow-hidden">
              {sorted.map((exp, idx) => (
                <div
                  key={exp.id}
                  className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.06] last:border-b-0"
                >
                  {/* Emoji icon */}
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 13,
                      background: "rgba(20,20,20,1)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                      flexShrink: 0,
                    }}
                  >
                    {getCategoryEmoji(exp.category)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[14px] font-bold truncate"
                      style={{ color: T.bright }}
                    >
                      {exp.name}
                    </p>
                    <p
                      className="text-[12px] font-medium mt-0.5"
                      style={{ color: T.muted }}
                    >
                      {exp.category} · {formatDate(exp.expenseDate)}
                    </p>
                  </div>

                  {/* Amount */}
                  <p
                    className="text-[15px] font-extrabold font-mono flex-shrink-0"
                    style={{ color: "#F87171" }}
                  >
                    {formatCurrency(convert(exp.amount, exp.currency), defaultCurrency)}
                  </p>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => setExpenseToDelete(exp)}
                    disabled={deleteExpenseMutation.isPending}
                    className="flex-shrink-0 p-1.5 rounded-lg transition-colors hover:bg-red-500/10 disabled:opacity-40"
                    style={{ color: "#F87171" }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </Card>
          </div>
        </>
      )}

      {/* ── Add Expense Modal ── */}
      {mounted && createPortal(<AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeForm} />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="relative z-10 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl"
              style={{
                background:
                  "linear-gradient(145deg, #141414 0%, #0f0f0f 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow:
                  "0 4px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag handle (mobile) */}
              <div className="sm:hidden flex justify-center mb-4">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              <h3
                className="text-[18px] font-extrabold tracking-[-0.02em] mb-1"
                style={{ color: T.bright }}
              >
                Log expense
              </h3>
              <p className="text-[12px] mb-5" style={{ color: T.muted }}>
                Record a cost you paid for — no splitting needed.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label
                    className="block text-[11px] font-bold uppercase tracking-wider mb-1.5"
                    style={{ color: T.soft }}
                  >
                    Description
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="e.g. Figma subscription"
                    className="w-full rounded-xl px-4 py-3 text-[14px] bg-white/[0.05] border border-white/[0.09] text-white placeholder-white/25 outline-none focus:border-white/20 transition-colors"
                  />
                </div>

                {/* Amount + Currency */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      className="block text-[11px] font-bold uppercase tracking-wider mb-1.5"
                      style={{ color: T.soft }}
                    >
                      Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.amount}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, amount: e.target.value }))
                      }
                      placeholder="0.00"
                      className="w-full rounded-xl px-4 py-3 text-[14px] bg-white/[0.05] border border-white/[0.09] text-white placeholder-white/25 outline-none focus:border-white/20 transition-colors"
                    />
                  </div>
                  <div>
                    <label
                      className="block text-[11px] font-bold uppercase tracking-wider mb-1.5"
                      style={{ color: T.soft }}
                    >
                      Currency
                    </label>
                    <CurrencyDropdown
                      selectedCurrencies={form.currency ? [form.currency] : []}
                      setSelectedCurrencies={(currencies) =>
                        setForm((p) => ({ ...p, currency: currencies[0] || "USD" }))
                      }
                      mode="single"
                      showFiatCurrencies={true}
                      disableChainCurrencies={true}
                      filterCurrencies={(c: Currency) => c.symbol !== "ETH" && c.symbol !== "USDC"}
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label
                    className="block text-[11px] font-bold uppercase tracking-wider mb-2"
                    style={{ color: T.soft }}
                  >
                    Category
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.label}
                        type="button"
                        onClick={() =>
                          setForm((p) => ({ ...p, category: cat.label }))
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold border transition-all"
                        style={
                          form.category === cat.label
                            ? {
                                background: `${A}18`,
                                color: A,
                                borderColor: `${A}30`,
                              }
                            : {
                                background: "transparent",
                                color: T.muted,
                                borderColor: "rgba(255,255,255,0.09)",
                              }
                        }
                      >
                        <span>{cat.emoji}</span>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label
                    className="block text-[11px] font-bold uppercase tracking-wider mb-1.5"
                    style={{ color: T.soft }}
                  >
                    Date
                  </label>
                  <input
                    type="date"
                    value={form.expenseDate}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, expenseDate: e.target.value }))
                    }
                    className="w-full rounded-xl px-4 py-3 text-[14px] bg-white/[0.05] border border-white/[0.09] text-white outline-none focus:border-white/20 transition-colors [color-scheme:dark]"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="flex-1 h-12 rounded-xl border font-semibold text-[13px] transition-all hover:bg-white/5"
                    style={{
                      borderColor: "rgba(255,255,255,0.1)",
                      color: T.body,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createExpenseMutation.isPending}
                    className="flex-1 h-12 rounded-xl font-bold text-[13px] transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: A, color: "#0a0a0a" }}
                  >
                    {createExpenseMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Log expense"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>, document.body)}

      {/* ── Delete confirm ── */}
      {mounted && createPortal(<AnimatePresence>
        {expenseToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-black/70"
              onClick={() =>
                !deleteExpenseMutation.isPending && setExpenseToDelete(null)
              }
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-sm rounded-2xl p-6 shadow-2xl"
              style={{
                background:
                  "linear-gradient(145deg, #141414 0%, #0f0f0f 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                className="text-[16px] font-bold mb-2"
                style={{ color: T.bright }}
              >
                Delete expense?
              </h3>
              <p className="text-[13px] mb-5" style={{ color: T.body }}>
                <span
                  className="font-semibold"
                  style={{ color: T.bright }}
                >
                  &ldquo;{expenseToDelete.name}&rdquo;
                </span>{" "}
                will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setExpenseToDelete(null)}
                  disabled={deleteExpenseMutation.isPending}
                  className="flex-1 h-11 rounded-xl border font-semibold text-[13px] transition-all hover:bg-white/5 disabled:opacity-50"
                  style={{
                    borderColor: "rgba(255,255,255,0.1)",
                    color: T.body,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={deleteExpenseMutation.isPending}
                  className="flex-1 h-11 rounded-xl font-bold text-[13px] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{
                    background: "rgba(248,113,113,0.15)",
                    color: "#F87171",
                    border: "1px solid rgba(248,113,113,0.25)",
                  }}
                >
                  {deleteExpenseMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>, document.body)}
    </div>
  );
}
