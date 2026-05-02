"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import {
  useGetExpenses,
  useCreateExpense,
  useDeleteExpense,
  useUpdateExpense,
} from "@/features/expenses/hooks/use-create-expense";
import { Loader2, Plus, Trash2, Pencil, ClipboardPaste, LayoutGrid, Table2, Search, ChevronDown, Check, CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";
import { Card, SectionLabel, T, A } from "@/lib/splito-design";
import { motion, AnimatePresence } from "framer-motion";
import CurrencyDropdown from "@/components/currency-dropdown";
import ImportExpensesModal from "@/components/import-expenses-modal";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useQueries } from "@tanstack/react-query";
import { getExchangeRate } from "@/features/currencies/api/client";
import { CURRENCY_QUERY_KEYS } from "@/features/currencies/hooks/use-currencies";
import {
  EXPENSE_CATEGORIES as CATEGORIES,
  getCategoryEmoji,
} from "@/lib/expense-categories";

type Expense = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  expenseDate: string;
  category: string;
  paidBy?: string;
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMonthLabel(key: string) {
  const [year, month] = key.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase();
}

function parseVendorFromName(name: string): { vendor: string; description: string } {
  const sep = name.indexOf(" - ");
  if (sep !== -1) return { vendor: name.slice(0, sep), description: name.slice(sep + 3) };
  return { vendor: name, description: "" };
}

export default function OrganizationExpensesPage() {
  const params = useParams();
  const organizationId = params?.organizationId as string;
  const { user } = useAuthStore();
  const { data, isLoading } = useGetExpenses(organizationId);
  const expenses = ((data as { expenses?: Expense[] })?.expenses ?? []) as Expense[];
  const createExpenseMutation = useCreateExpense(organizationId);
  const deleteExpenseMutation = useDeleteExpense(organizationId);
  const updateExpenseMutation = useUpdateExpense(organizationId);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [vendorOpen, setVendorOpen] = useState(false);
  const [vendorActive, setVendorActive] = useState(0);
  const vendorInputRef = useRef<HTMLInputElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const emptyForm = {
    vendor: "",
    description: "",
    amount: "",
    currency: user?.currency || "USD",
    category: "Business",
    expenseDate: new Date().toISOString().slice(0, 10),
  };
  const [form, setForm] = useState(emptyForm);

  // Vendor autocomplete from existing expenses
  const knownVendors = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => {
      const { vendor } = parseVendorFromName(e.name);
      if (vendor) set.add(vendor);
    });
    return [...set].sort();
  }, [expenses]);

  // Latest expense per vendor (case-insensitive) — used for autofill
  const latestByVendor = useMemo(() => {
    const map = new Map<string, Expense>();
    const sorted = [...expenses].sort(
      (a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()
    );
    for (const e of sorted) {
      const { vendor } = parseVendorFromName(e.name);
      if (!vendor) continue;
      const key = vendor.toLowerCase();
      if (!map.has(key)) map.set(key, e);
    }
    return map;
  }, [expenses]);

  const autofillFromVendor = (vendor: string) => {
    const last = latestByVendor.get(vendor.toLowerCase());
    if (!last) {
      setForm((p) => ({ ...p, vendor }));
      return;
    }
    const fillAmount = ["software", "salary"].includes((last.category || "").toLowerCase());
    setForm((p) => ({
      ...p,
      vendor,
      category: last.category || p.category,
      currency: last.currency || p.currency,
      ...(fillAmount && !p.amount ? { amount: String(last.amount) } : {}),
    }));
  };

  // When opening edit modal, populate form from expense
  useEffect(() => {
    if (editingExpense) {
      const { vendor, description } = parseVendorFromName(editingExpense.name);
      setForm({
        vendor,
        description,
        amount: String(editingExpense.amount),
        currency: editingExpense.currency,
        category: editingExpense.category,
        expenseDate: editingExpense.expenseDate
          ? new Date(editingExpense.expenseDate).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
      });
      setModalOpen(true);
    }
  }, [editingExpense]);

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

  // ── Filtering ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = expenses;
    if (categoryFilter) {
      result = result.filter((e) => e.category.toUpperCase() === categoryFilter.toUpperCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) => e.name.toLowerCase().includes(q));
    }
    return result;
  }, [expenses, categoryFilter, searchQuery]);

  // ── Monthly grouping ───────────────────────────────────────
  const sorted = [...filtered].sort(
    (a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()
  );
  const monthGroups = useMemo(() => {
    const groups: { key: string; label: string; expenses: Expense[]; total: number }[] = [];
    const map = new Map<string, Expense[]>();
    for (const exp of sorted) {
      const d = new Date(exp.expenseDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(exp);
    }
    for (const [key, exps] of map) {
      groups.push({
        key,
        label: formatMonthLabel(key),
        expenses: exps,
        total: exps.reduce((s, e) => s + convert(e.amount, e.currency), 0),
      });
    }
    return groups;
  }, [sorted, rateMap]);

  // ── Handlers ─────────────────────────────────────────────────
  const closeForm = () => {
    setModalOpen(false);
    setEditingExpense(null);
    setForm(emptyForm);
  };

  const buildName = (vendor: string, description: string) => {
    if (vendor && description) return `${vendor} - ${description}`;
    return vendor || description;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    const name = buildName(form.vendor.trim(), form.description.trim());
    if (!name || isNaN(amount) || amount <= 0) {
      toast.error("Please enter a vendor/description and valid amount");
      return;
    }
    if (!user?.id) return;

    if (editingExpense) {
      updateExpenseMutation.mutate(
        {
          expenseId: editingExpense.id,
          payload: {
            name,
            category: form.category,
            amount,
            splitType: "EXACT",
            currency: form.currency,
            participants: [{ userId: user.id, amount }],
            expenseDate: form.expenseDate,
          },
        },
        {
          onSuccess: () => {
            toast.success("Expense updated");
            closeForm();
          },
          onError: (err: Error) => toast.error(err?.message ?? "Failed to update expense"),
        }
      );
    } else {
      createExpenseMutation.mutate(
        {
          name,
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
    }
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

  const isMutating = createExpenseMutation.isPending || updateExpenseMutation.isPending;

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
              : filtered.length !== expenses.length
                ? `${filtered.length} of ${expenses.length} expenses`
                : `${expenses.length} expense${expenses.length !== 1 ? "s" : ""} logged`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div
            className="flex items-center rounded-xl overflow-hidden border"
            style={{ borderColor: "rgba(255,255,255,0.1)" }}
          >
            {([
              { key: "card" as const, icon: LayoutGrid, label: "Cards" },
              { key: "table" as const, icon: Table2, label: "Table" },
            ]).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setViewMode(key)}
                title={label}
                className="h-10 w-10 flex items-center justify-center transition-all"
                style={{
                  background: viewMode === key ? "rgba(255,255,255,0.1)" : "transparent",
                  color: viewMode === key ? "#fff" : T.muted,
                }}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 rounded-xl h-10 px-4 text-[13px] font-extrabold border transition-all hover:bg-white/5"
            style={{ borderColor: "rgba(255,255,255,0.12)", color: T.body }}
          >
            <ClipboardPaste className="h-4 w-4" /> Import
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-xl h-10 px-4 text-[13px] font-extrabold transition-all hover:opacity-90"
            style={{ background: A, color: "#0a0a0a" }}
          >
            <Plus className="h-4 w-4" /> Add expense
          </button>
        </div>
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
          <p style={{ fontSize: 18, fontWeight: 800, color: T.body, marginBottom: 8 }}>
            No expenses yet
          </p>
          <p style={{ fontSize: 14, color: T.sub, marginBottom: 20 }}>
            Log business expenses like subscriptions, tools, and one-off costs.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setImportOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-extrabold border transition-all hover:bg-white/5"
              style={{ borderColor: "rgba(255,255,255,0.12)", color: T.body }}
            >
              <ClipboardPaste className="h-4 w-4" /> Import from text
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-extrabold transition-all hover:opacity-90"
              style={{ background: A, color: "#0a0a0a" }}
            >
              <Plus className="h-4 w-4" /> Add first expense
            </button>
          </div>
        </div>
      )}

      {/* ── Summary + List ── */}
      {!isLoading && expenses.length > 0 && (
        <>
          {/* Summary hero */}
          <div
            className="rounded-2xl sm:rounded-3xl border border-white/[0.09] p-5 sm:p-7"
            style={{
              background: "linear-gradient(135deg, #141414 0%, #0f0f0f 100%)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            <div className="grid grid-cols-2 gap-0">
              <div className="min-w-0 pr-4 sm:pr-6 border-r border-white/[0.07]">
                <p className="text-[10px] font-semibold tracking-[0.06em] uppercase mb-1.5" style={{ color: T.dim }}>
                  Total
                </p>
                <p className="text-[22px] sm:text-[24px] font-extrabold font-mono" style={{ color: "#F87171" }}>
                  {formatCurrency(totalExpenses, defaultCurrency)}
                </p>
              </div>
              <div className="min-w-0 pl-4 sm:pl-6">
                <p className="text-[10px] font-semibold tracking-[0.06em] uppercase mb-1.5" style={{ color: T.dim }}>
                  This month
                </p>
                <p className="text-[22px] sm:text-[24px] font-extrabold font-mono" style={{ color: "#22D3EE" }}>
                  {formatCurrency(thisMonthExpenses, defaultCurrency)}
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: T.dim }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search expenses…"
                className="w-full rounded-xl pl-9 pr-3 py-2.5 text-[13px] bg-white/[0.05] border border-white/[0.09] text-white placeholder-white/25 outline-none focus:border-white/20 transition-colors"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-1.5 rounded-xl h-10 px-3 text-[13px] font-semibold border transition-all hover:bg-white/5 flex-shrink-0"
                  style={{ borderColor: "rgba(255,255,255,0.1)", color: categoryFilter ? T.bright : T.muted }}
                >
                  {categoryFilter ? (
                    <><span>{getCategoryEmoji(categoryFilter)}</span> {categoryFilter}</>
                  ) : (
                    "Category"
                  )}
                  <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-44 rounded-xl p-1"
                style={{
                  background: "linear-gradient(145deg, #1a1a1a 0%, #141414 100%)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                }}
              >
                <DropdownMenuItem
                  onClick={() => setCategoryFilter(null)}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-[13px] font-medium cursor-pointer focus:bg-white/[0.06]"
                  style={{ color: !categoryFilter ? T.bright : T.body }}
                >
                  All
                  {!categoryFilter && <Check className="h-3.5 w-3.5" style={{ color: A }} />}
                </DropdownMenuItem>
                {CATEGORIES.map((cat) => (
                  <DropdownMenuItem
                    key={cat.label}
                    onClick={() => setCategoryFilter(cat.label)}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-[13px] font-medium cursor-pointer focus:bg-white/[0.06]"
                    style={{ color: categoryFilter === cat.label ? T.bright : T.body }}
                  >
                    <span className="flex items-center gap-2">
                      <span>{cat.emoji}</span> {cat.label}
                    </span>
                    {categoryFilter === cat.label && <Check className="h-3.5 w-3.5" style={{ color: A }} />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* ── Card View ── */}
          {viewMode === "card" && (
            <div className="space-y-4">
              {monthGroups.map((group) => (
                <div key={group.key}>
                  <div className="flex items-center justify-between mb-2">
                    <SectionLabel>{group.label}</SectionLabel>
                    <p className="text-[12px] font-bold font-mono" style={{ color: T.muted }}>
                      {group.expenses.length} expense{group.expenses.length !== 1 ? "s" : ""} · {formatCurrency(group.total, defaultCurrency)}
                    </p>
                  </div>
                  <Card className="p-0 overflow-hidden">
                    {group.expenses.map((exp) => (
                      <div
                        key={exp.id}
                        className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.06] last:border-b-0"
                      >
                        <div
                          style={{
                            width: 42, height: 42, borderRadius: 13,
                            background: "rgba(20,20,20,1)",
                            border: "1px solid rgba(255,255,255,0.09)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 20, flexShrink: 0,
                          }}
                        >
                          {getCategoryEmoji(exp.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-bold truncate" style={{ color: T.bright }}>
                            {exp.name}
                          </p>
                          <p className="text-[12px] font-medium mt-0.5" style={{ color: T.muted }}>
                            {exp.category} · {formatDate(exp.expenseDate)}
                            {exp.currency !== defaultCurrency && (
                              <span className="ml-1 opacity-60">({formatCurrency(exp.amount, exp.currency)})</span>
                            )}
                          </p>
                        </div>
                        <p className="text-[15px] font-extrabold font-mono flex-shrink-0" style={{ color: "#F87171" }}>
                          {formatCurrency(convert(exp.amount, exp.currency), defaultCurrency)}
                        </p>
                        <button type="button" onClick={() => setEditingExpense(exp)} className="flex-shrink-0 p-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ color: T.muted }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => setExpenseToDelete(exp)} disabled={deleteExpenseMutation.isPending} className="flex-shrink-0 p-1.5 rounded-lg transition-colors hover:bg-red-500/10 disabled:opacity-40" style={{ color: "#F87171" }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </Card>
                </div>
              ))}
            </div>
          )}

          {/* ── Table View ── */}
          {viewMode === "table" && (
            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      {["Date", "Name", "Category", "Amount", ""].map((h) => (
                        <th
                          key={h}
                          className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap"
                          style={{ color: T.dim }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((exp) => (
                      <tr
                        key={exp.id}
                        className="border-b border-white/[0.05] last:border-b-0 transition-colors hover:bg-white/[0.02]"
                      >
                        <td className="px-5 py-3.5 text-[13px] font-mono whitespace-nowrap" style={{ color: T.muted }}>
                          {formatDate(exp.expenseDate)}
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-[13px] font-bold truncate max-w-[260px]" style={{ color: T.bright }}>{exp.name}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                            style={{ background: "rgba(255,255,255,0.05)", color: T.body }}
                          >
                            {getCategoryEmoji(exp.category)} {exp.category}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[14px] font-extrabold font-mono whitespace-nowrap" style={{ color: "#F87171" }}>
                          {formatCurrency(convert(exp.amount, exp.currency), defaultCurrency)}
                          {exp.currency !== defaultCurrency && (
                            <span className="text-[11px] font-medium ml-1.5 opacity-50">
                              {formatCurrency(exp.amount, exp.currency)}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => setEditingExpense(exp)} className="p-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ color: T.muted }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" onClick={() => setExpenseToDelete(exp)} disabled={deleteExpenseMutation.isPending} className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 disabled:opacity-40" style={{ color: "#F87171" }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

        </>
      )}

      {/* ── Add/Edit Expense Modal ── */}
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
                background: "linear-gradient(145deg, #141414 0%, #0f0f0f 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 4px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sm:hidden flex justify-center mb-4">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              <h3 className="text-[18px] font-extrabold tracking-[-0.02em] mb-1" style={{ color: T.bright }}>
                {editingExpense ? "Edit expense" : "Log expense"}
              </h3>
              <p className="text-[12px] mb-5" style={{ color: T.muted }}>
                {editingExpense ? "Update the expense details." : "Record a cost you paid for — no splitting needed."}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Vendor */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: T.soft }}>
                    Vendor / Payee
                  </label>
                  {(() => {
                    const q = form.vendor.trim().toLowerCase();
                    const matches = knownVendors
                      .filter((v) => !q || v.toLowerCase().includes(q))
                      .filter((v) => v.toLowerCase() !== q);
                    const showList = vendorOpen && matches.length > 0;
                    const pick = (v: string) => {
                      autofillFromVendor(v);
                      setVendorOpen(false);
                    };
                    return (
                      <div className="relative">
                        <input
                          ref={vendorInputRef}
                          type="text"
                          value={form.vendor}
                          onChange={(e) => {
                            setForm((p) => ({ ...p, vendor: e.target.value }));
                            setVendorOpen(true);
                            setVendorActive(0);
                          }}
                          onFocus={() => { setVendorOpen(true); setVendorActive(0); }}
                          onBlur={() => setTimeout(() => setVendorOpen(false), 120)}
                          onKeyDown={(e) => {
                            if (!showList) return;
                            if (e.key === "ArrowDown") {
                              e.preventDefault();
                              setVendorActive((i) => (i + 1) % matches.length);
                            } else if (e.key === "ArrowUp") {
                              e.preventDefault();
                              setVendorActive((i) => (i - 1 + matches.length) % matches.length);
                            } else if (e.key === "Enter") {
                              e.preventDefault();
                              pick(matches[vendorActive] || matches[0]);
                            } else if (e.key === "Escape") {
                              setVendorOpen(false);
                            }
                          }}
                          placeholder="e.g. Vercel, Akash, Brevo"
                          autoComplete="off"
                          className="w-full rounded-xl px-4 py-3 pr-11 text-[14px] bg-white/[0.05] border border-white/[0.09] text-white placeholder-white/25 outline-none focus:border-white/20 transition-colors"
                          autoFocus
                        />
                        {form.vendor && (
                          <button
                            type="button"
                            aria-label="Reset form"
                            title="Reset form"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setForm(emptyForm);
                              setVendorActive(0);
                              setVendorOpen(true);
                              vendorInputRef.current?.focus();
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/[0.08]"
                            style={{ color: T.muted }}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                        <AnimatePresence>
                          {showList && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.12 }}
                              className="absolute z-30 left-0 right-0 mt-1.5 rounded-xl border overflow-hidden"
                              style={{
                                background: "#141414",
                                borderColor: "rgba(255,255,255,0.09)",
                                boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
                                maxHeight: 240,
                                overflowY: "auto",
                              }}
                            >
                              {matches.map((v, i) => (
                                <button
                                  key={v}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => pick(v)}
                                  onMouseEnter={() => setVendorActive(i)}
                                  className="w-full text-left px-4 py-2.5 text-[13px] transition-colors"
                                  style={{
                                    color: i === vendorActive ? "#fff" : T.body,
                                    background: i === vendorActive ? "rgba(255,255,255,0.06)" : "transparent",
                                  }}
                                >
                                  {v}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })()}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: T.soft }}>
                    Description <span className="opacity-50">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="e.g. Monthly subscription"
                    className="w-full rounded-xl px-4 py-3 text-[14px] bg-white/[0.05] border border-white/[0.09] text-white placeholder-white/25 outline-none focus:border-white/20 transition-colors"
                  />
                </div>

                {/* Amount + Currency */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: T.soft }}>
                      Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.amount}
                      onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                      placeholder="0.00"
                      className="w-full rounded-xl px-4 py-3 text-[14px] bg-white/[0.05] border border-white/[0.09] text-white placeholder-white/25 outline-none focus:border-white/20 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: T.soft }}>
                      Currency
                    </label>
                    <CurrencyDropdown
                      selectedCurrencies={form.currency ? [form.currency] : []}
                      setSelectedCurrencies={(currencies) =>
                        setForm((p) => ({ ...p, currency: currencies[0] || "USD" }))
                      }
                      mode="single"
                      showFiatCurrencies={true}
                      size="lg"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: T.soft }}>
                    Category
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.label}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, category: cat.label }))}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold border transition-all"
                        style={
                          form.category === cat.label
                            ? { background: `${A}18`, color: A, borderColor: `${A}30` }
                            : { background: "transparent", color: T.muted, borderColor: "rgba(255,255,255,0.09)" }
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
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: T.soft }}>
                    Date
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-full rounded-xl px-4 py-3 text-[14px] bg-white/[0.05] border border-white/[0.09] text-white outline-none focus:border-white/20 transition-colors flex items-center gap-2.5 hover:bg-white/[0.07]"
                      >
                        <CalendarIcon className="h-4 w-4 shrink-0" style={{ color: T.muted }} />
                        <span>
                          {form.expenseDate
                            ? format(new Date(form.expenseDate + "T00:00:00"), "EEE, dd MMM yyyy")
                            : "Pick a date"}
                        </span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="dark w-auto p-0 rounded-xl border"
                      style={{ background: "#141414", borderColor: "rgba(255,255,255,0.09)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
                    >
                      <Calendar
                        mode="single"
                        selected={form.expenseDate ? new Date(form.expenseDate + "T00:00:00") : undefined}
                        onSelect={(date) => {
                          if (!date) return;
                          const yyyy = date.getFullYear();
                          const mm = String(date.getMonth() + 1).padStart(2, "0");
                          const dd = String(date.getDate()).padStart(2, "0");
                          setForm((p) => ({ ...p, expenseDate: `${yyyy}-${mm}-${dd}` }));
                        }}
                        defaultMonth={form.expenseDate ? new Date(form.expenseDate + "T00:00:00") : new Date()}
                        className="rounded-xl"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="flex-1 h-12 rounded-xl border font-semibold text-[13px] transition-all hover:bg-white/5"
                    style={{ borderColor: "rgba(255,255,255,0.1)", color: T.body }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isMutating}
                    className="flex-1 h-12 rounded-xl font-bold text-[13px] transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: A, color: "#0a0a0a" }}
                  >
                    {isMutating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : editingExpense ? (
                      "Save changes"
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
              onClick={() => !deleteExpenseMutation.isPending && setExpenseToDelete(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-sm rounded-2xl p-6 shadow-2xl"
              style={{
                background: "linear-gradient(145deg, #141414 0%, #0f0f0f 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-[16px] font-bold mb-2" style={{ color: T.bright }}>
                Delete expense?
              </h3>
              <p className="text-[13px] mb-5" style={{ color: T.body }}>
                <span className="font-semibold" style={{ color: T.bright }}>
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
                  style={{ borderColor: "rgba(255,255,255,0.1)", color: T.body }}
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

      {/* ── Import Modal ── */}
      <ImportExpensesModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        organizationId={organizationId}
      />
    </div>
  );
}
