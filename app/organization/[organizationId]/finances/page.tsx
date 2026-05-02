"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import {
  useGetExpenses,
  useCreateExpense,
  useDeleteExpense,
  useUpdateExpense,
} from "@/features/expenses/hooks/use-create-expense";
import { useGetStreamsByOrganization, useDeleteStream } from "@/features/business/hooks/use-streams";
import { useOrganizationOrg } from "@/contexts/organization-org-context";
import {
  Loader2, Plus, Trash2, Pencil, ClipboardPaste, LayoutGrid, Table2,
  Search, ChevronDown, Check, CalendarIcon, X, ArrowDownRight, ArrowUpRight,
} from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";
import { Card, SectionLabel, T, A, G } from "@/lib/splito-design";
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

type Stream = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  description?: string | null;
  receivedDate: Date | string;
};

type EntryType = "all" | "income" | "expense";

type Entry =
  | { kind: "expense"; id: string; date: Date; data: Expense }
  | { kind: "income"; id: string; date: Date; data: Stream };

const RED = "#F87171";

function parseType(v: string | null | undefined): EntryType {
  if (v === "income" || v === "expense") return v;
  return "all";
}

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

export default function OrganizationFinancesPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizationId = params?.organizationId as string;
  const { user } = useAuthStore();
  const { isAdmin, openStreamModal, openEditStream } = useOrganizationOrg();

  // ── Type filter (URL synced; supports legacy ?tab= param) ──
  const initialType: EntryType = parseType(
    searchParams?.get("type") ?? (searchParams?.get("tab") === "expenses" ? "expense" : searchParams?.get("tab"))
  );
  const [typeFilter, setTypeFilter] = useState<EntryType>(initialType);
  const setTypeFilterUrl = (t: EntryType) => {
    setTypeFilter(t);
    const sp = new URLSearchParams(searchParams?.toString() ?? "");
    sp.delete("tab");
    if (t === "all") sp.delete("type");
    else sp.set("type", t);
    const qs = sp.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  };

  // ── Data ────────────────────────────────────────────────────
  const { data: expData, isLoading: isLoadingExp } = useGetExpenses(organizationId);
  const expenses = ((expData as { expenses?: Expense[] })?.expenses ?? []) as Expense[];
  const { data: streams = [], isLoading: isLoadingStreams } = useGetStreamsByOrganization(
    organizationId,
    { enabled: !!isAdmin }
  );
  const createExpenseMutation = useCreateExpense(organizationId);
  const deleteExpenseMutation = useDeleteExpense(organizationId);
  const updateExpenseMutation = useUpdateExpense(organizationId);
  const deleteStreamMutation = useDeleteStream();

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ── Redirect non-admins ─────────────────────────────────────
  useEffect(() => {
    if (isAdmin === false && organizationId) {
      router.replace(`/organization/${organizationId}/invoices`);
    }
  }, [isAdmin, organizationId, router]);

  // ── Currency conversion (across both expenses and streams) ─
  const defaultCurrency = user?.currency || "USD";
  const uniqueCurrencies = useMemo(() => {
    const all = new Set<string>();
    expenses.forEach((e) => all.add(e.currency));
    (streams as Stream[]).forEach((s) => all.add(s.currency));
    all.delete(defaultCurrency);
    return [...all];
  }, [expenses, streams, defaultCurrency]);
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

  const totalExpenses = expenses.reduce((s, e) => s + convert(e.amount, e.currency), 0);
  const monthExpenses = expenses
    .filter((e) => new Date(e.expenseDate) >= startOfMonth)
    .reduce((s, e) => s + convert(e.amount, e.currency), 0);
  const totalIncome = (streams as Stream[]).reduce(
    (s, x) => s + convert(x.amount, x.currency),
    0
  );
  const monthIncome = (streams as Stream[])
    .filter((x) => new Date(x.receivedDate) >= startOfMonth)
    .reduce((s, x) => s + convert(x.amount, x.currency), 0);
  const netFlow = totalIncome - totalExpenses;
  const monthNet = monthIncome - monthExpenses;

  // ──────────────────────────────────────────────────────────────
  // EXPENSE TAB STATE / LOGIC (preserved from original page)
  // ──────────────────────────────────────────────────────────────
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
  const [streamToDelete, setStreamToDelete] = useState<Stream | null>(null);

  const emptyForm = {
    vendor: "",
    description: "",
    amount: "",
    currency: user?.currency || "USD",
    category: "Business",
    expenseDate: new Date().toISOString().slice(0, 10),
  };
  const [form, setForm] = useState(emptyForm);

  const knownVendors = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => {
      const { vendor } = parseVendorFromName(e.name);
      if (vendor) set.add(vendor);
    });
    return [...set].sort();
  }, [expenses]);

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

  // ── Unified entry feed (income + expense) ──────────────────
  const allEntries = useMemo<Entry[]>(() => {
    const list: Entry[] = [];
    for (const e of expenses) {
      list.push({ kind: "expense", id: e.id, date: new Date(e.expenseDate), data: e });
    }
    for (const s of streams as Stream[]) {
      list.push({ kind: "income", id: s.id, date: new Date(s.receivedDate), data: s });
    }
    return list;
  }, [expenses, streams]);

  const filteredEntries = useMemo(() => {
    let result = allEntries;
    if (typeFilter !== "all") {
      result = result.filter((x) => x.kind === typeFilter);
    }
    if (categoryFilter) {
      // Category only applies to expenses; hides income unless type is "income" already excluded above
      result = result.filter((x) =>
        x.kind === "expense" && x.data.category.toUpperCase() === categoryFilter.toUpperCase()
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((x) => {
        const name = x.data.name.toLowerCase();
        const note = x.kind === "income" ? (x.data.description ?? "").toLowerCase() : "";
        return name.includes(q) || note.includes(q);
      });
    }
    return [...result].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [allEntries, typeFilter, categoryFilter, searchQuery]);

  const monthGroups = useMemo(() => {
    type Group = { key: string; label: string; entries: Entry[]; income: number; expense: number };
    const groups: Group[] = [];
    const map = new Map<string, Entry[]>();
    for (const e of filteredEntries) {
      const key = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    for (const [key, entries] of map) {
      let income = 0;
      let expense = 0;
      for (const e of entries) {
        const amt = convert(e.data.amount, e.data.currency);
        if (e.kind === "income") income += amt;
        else expense += amt;
      }
      groups.push({ key, label: formatMonthLabel(key), entries, income, expense });
    }
    return groups;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredEntries, JSON.stringify(rateMap)]);

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
      onSuccess: () => { toast.success("Expense deleted"); setExpenseToDelete(null); },
      onError: () => { toast.error("Failed to delete expense"); setExpenseToDelete(null); },
    });
  };

  const handleStreamDeleteConfirm = () => {
    if (!streamToDelete) return;
    deleteStreamMutation.mutate(
      { organizationId, streamId: streamToDelete.id },
      {
        onSuccess: () => { toast.success("Income entry removed"); setStreamToDelete(null); },
        onError: () => { toast.error("Failed to remove income entry"); setStreamToDelete(null); },
      }
    );
  };

  const isMutating = createExpenseMutation.isPending || updateExpenseMutation.isPending;
  const isLoading = isLoadingExp || (isAdmin && isLoadingStreams);

  if (!isAdmin) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-white/30" />
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────
  return (
    <TooltipProvider delayDuration={0} skipDelayDuration={0}>
    <div className="w-full space-y-5 sm:space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[20px] sm:text-[22px] font-extrabold tracking-[-0.02em] text-white">
            Finances
          </h1>
          <p className="text-[12px] font-medium mt-0.5" style={{ color: T.muted }}>
            {isLoading
              ? "Loading…"
              : `${(streams as Stream[]).length} income · ${expenses.length} expense${expenses.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            className="hidden sm:flex items-center gap-2 rounded-xl h-10 px-4 text-[13px] font-extrabold border transition-all hover:bg-white/5"
            style={{ borderColor: "rgba(255,255,255,0.12)", color: T.body }}
          >
            <ClipboardPaste className="h-4 w-4" /> Import
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 rounded-xl h-10 px-4 text-[13px] font-extrabold transition-all hover:opacity-90"
                style={{ background: A, color: "#0a0a0a" }}
              >
                <Plus className="h-4 w-4" /> Add <ChevronDown className="h-3.5 w-3.5 -ml-1 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-52 rounded-xl p-1"
              style={{
                background: "linear-gradient(145deg, #1a1a1a 0%, #141414 100%)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
              }}
            >
              <DropdownMenuItem
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium cursor-pointer focus:bg-white/[0.06]"
                style={{ color: T.body }}
              >
                <ArrowDownRight className="h-4 w-4" style={{ color: RED }} />
                <span className="flex-1">Expense</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openStreamModal()}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium cursor-pointer focus:bg-white/[0.06]"
                style={{ color: T.body }}
              >
                <ArrowUpRight className="h-4 w-4" style={{ color: G }} />
                <span className="flex-1">Income received</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Net flow hero ──────────────────────────────────────── */}
      <div
        className="rounded-2xl sm:rounded-3xl border border-white/[0.09] p-5 sm:p-6"
        style={{
          background: "linear-gradient(135deg, #141414 0%, #0f0f0f 100%)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        <div className="grid grid-cols-3 gap-0">
          <div className="min-w-0 pr-3 sm:pr-5 border-r border-white/[0.07]">
            <p className="flex items-center gap-1 text-[10px] font-semibold tracking-[0.06em] uppercase mb-1.5" style={{ color: T.dim }}>
              <ArrowUpRight className="h-3 w-3" /> Income
            </p>
            <p className="text-[20px] sm:text-[24px] font-extrabold font-mono truncate" style={{ color: G }}>
              {formatCurrency(totalIncome, defaultCurrency)}
            </p>
            <p className="text-[10px] sm:text-[11px] font-medium mt-1" style={{ color: T.dim }}>
              {formatCurrency(monthIncome, defaultCurrency)} this month
            </p>
          </div>
          <div className="min-w-0 px-3 sm:px-5 border-r border-white/[0.07]">
            <p className="flex items-center gap-1 text-[10px] font-semibold tracking-[0.06em] uppercase mb-1.5" style={{ color: T.dim }}>
              <ArrowDownRight className="h-3 w-3" /> Expenses
            </p>
            <p className="text-[20px] sm:text-[24px] font-extrabold font-mono truncate" style={{ color: RED }}>
              {formatCurrency(totalExpenses, defaultCurrency)}
            </p>
            <p className="text-[10px] sm:text-[11px] font-medium mt-1" style={{ color: T.dim }}>
              {formatCurrency(monthExpenses, defaultCurrency)} this month
            </p>
          </div>
          <div className="min-w-0 pl-3 sm:pl-5">
            <p className="text-[10px] font-semibold tracking-[0.06em] uppercase mb-1.5" style={{ color: T.dim }}>
              Net flow
            </p>
            <p
              className="text-[20px] sm:text-[24px] font-extrabold font-mono truncate"
              style={{ color: netFlow >= 0 ? G : RED }}
            >
              {netFlow >= 0 ? "+" : ""}
              {formatCurrency(netFlow, defaultCurrency)}
            </p>
            <p className="text-[10px] sm:text-[11px] font-medium mt-1" style={{ color: T.dim }}>
              {monthNet >= 0 ? "+" : ""}
              {formatCurrency(monthNet, defaultCurrency)} this month
            </p>
          </div>
        </div>
      </div>

      {/* ── Loading ─────────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-white/30" />
        </div>
      )}

      {/* ── Empty (no entries at all) ───────────────────────────── */}
      {!isLoading && allEntries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p style={{ fontSize: 52, marginBottom: 16 }}>📒</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: T.body, marginBottom: 8 }}>
            Treasury is empty
          </p>
          <p style={{ fontSize: 14, color: T.sub, marginBottom: 20, maxWidth: 320 }}>
            Log income you received and expenses you paid. Everything lives in one timeline.
          </p>
          <div className="flex gap-3 flex-wrap justify-center">
            <button
              onClick={() => openStreamModal()}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-extrabold border transition-all hover:bg-white/5"
              style={{ borderColor: `${G}30`, color: G, background: `${G}10` }}
            >
              <ArrowUpRight className="h-4 w-4" /> Log income
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-extrabold transition-all hover:opacity-90"
              style={{ background: A, color: "#0a0a0a" }}
            >
              <Plus className="h-4 w-4" /> Log expense
            </button>
          </div>
        </div>
      )}

      {/* ── Filters + Type pill ─────────────────────────────────── */}
      {!isLoading && allEntries.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: T.dim }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-xl pl-9 pr-3 py-2.5 text-[13px] bg-white/[0.05] border border-white/[0.09] text-white placeholder-white/25 outline-none focus:border-white/20 transition-colors"
            />
          </div>

          {/* Category filter (disabled in income mode — categories don't apply) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={typeFilter === "income"}>
              <button
                disabled={typeFilter === "income"}
                title={typeFilter === "income" ? "Categories don't apply to income" : undefined}
                className="flex items-center gap-1.5 rounded-xl h-10 px-3 text-[13px] font-semibold border transition-all hover:bg-white/5 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
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
                align="start"
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

          {/* Type filter (3-way segmented) */}
          <div
            className="flex p-0.5 rounded-xl border flex-shrink-0"
            style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)" }}
          >
            {([
              { key: "all" as const, label: "All", count: allEntries.length, color: T.bright },
              { key: "income" as const, label: "Income", count: (streams as Stream[]).length, color: G, icon: ArrowUpRight },
              { key: "expense" as const, label: "Expense", count: expenses.length, color: RED, icon: ArrowDownRight },
            ]).map((item) => {
              const active = typeFilter === item.key;
              const Icon = "icon" in item ? item.icon : null;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setTypeFilterUrl(item.key);
                    if (item.key === "income") setCategoryFilter(null);
                  }}
                  className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-[12px] font-bold transition-all"
                  style={{
                    color: active ? "#fff" : T.muted,
                    background: active ? "rgba(255,255,255,0.07)" : "transparent",
                  }}
                >
                  {Icon && <Icon className="h-3 w-3" style={{ color: active ? item.color : T.dim }} />}
                  {item.label}
                  <span className="text-[10px] font-mono opacity-60">{item.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── No-match state ──────────────────────────────────────── */}
      {!isLoading && allEntries.length > 0 && filteredEntries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p style={{ fontSize: 14, color: T.muted }}>No entries match your filters.</p>
        </div>
      )}

      {/* ── Card view ───────────────────────────────────────────── */}
      {!isLoading && filteredEntries.length > 0 && viewMode === "card" && (
        <div className="space-y-4">
          {monthGroups.map((group) => {
            const net = group.income - group.expense;
            return (
              <div key={group.key}>
                <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                  <SectionLabel>{group.label}</SectionLabel>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <span
                        className="text-[12px] font-bold font-mono cursor-help inline-flex items-center gap-1 border-b border-dotted"
                        style={{
                          color: net >= 0 ? G : RED,
                          borderColor: "rgba(255,255,255,0.18)",
                        }}
                      >
                        {net >= 0 ? "+" : "−"}{formatCurrency(Math.abs(net), defaultCurrency)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent
                      side="left"
                      sideOffset={8}
                      className="rounded-lg px-3 py-2 text-[11px] font-mono font-bold"
                      style={{
                        background: "linear-gradient(145deg, #1a1a1a 0%, #141414 100%)",
                        color: T.bright,
                        border: "1px solid rgba(255,255,255,0.1)",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                      }}
                    >
                      <div className="flex flex-col gap-1 min-w-[140px]">
                        <div className="flex items-center justify-between gap-4">
                          <span style={{ color: T.dim }}>Income</span>
                          <span style={{ color: G }}>+{formatCurrency(group.income, defaultCurrency)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span style={{ color: T.dim }}>Expenses</span>
                          <span style={{ color: RED }}>−{formatCurrency(group.expense, defaultCurrency)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 pt-1 mt-0.5 border-t border-white/[0.08]">
                          <span style={{ color: T.dim }}>Net</span>
                          <span style={{ color: net >= 0 ? G : RED }}>
                            {net >= 0 ? "+" : "−"}{formatCurrency(Math.abs(net), defaultCurrency)}
                          </span>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Card className="p-0 overflow-hidden">
                  {group.entries.map((entry) => {
                    const isIncome = entry.kind === "income";
                    const color = isIncome ? G : RED;
                    const sign = isIncome ? "+" : "−";
                    const data = entry.data;
                    const dateStr = entry.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                    const meta = isIncome
                      ? `Income · ${dateStr}${(entry.kind === "income" && entry.data.description) ? ` · ${entry.data.description}` : ""}`
                      : `${entry.kind === "expense" ? entry.data.category : ""} · ${dateStr}`;
                    return (
                      <div
                        key={`${entry.kind}-${entry.id}`}
                        className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.06] last:border-b-0 hover:bg-white/[0.015] transition-colors"
                      >
                        <div
                          style={{
                            width: 42, height: 42, borderRadius: 13,
                            background: isIncome ? `${G}14` : "rgba(20,20,20,1)",
                            border: `1px solid ${isIncome ? `${G}30` : "rgba(255,255,255,0.09)"}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 20, flexShrink: 0,
                          }}
                        >
                          {isIncome ? (
                            <ArrowUpRight className="h-5 w-5" style={{ color: G }} />
                          ) : (
                            <span>{getCategoryEmoji(entry.data.category)}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-bold truncate" style={{ color: T.bright }}>
                            {data.name}
                          </p>
                          <p className="text-[12px] font-medium mt-0.5 truncate" style={{ color: T.muted }}>
                            {meta}
                            {data.currency !== defaultCurrency && (
                              <span className="ml-1 opacity-60">({formatCurrency(data.amount, data.currency)})</span>
                            )}
                          </p>
                        </div>
                        <p className="text-[15px] font-extrabold font-mono flex-shrink-0" style={{ color }}>
                          {sign}{formatCurrency(convert(data.amount, data.currency), defaultCurrency)}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            isIncome
                              ? openEditStream(entry.data as unknown as Parameters<typeof openEditStream>[0])
                              : setEditingExpense(entry.data as Expense)
                          }
                          className="flex-shrink-0 p-1.5 rounded-lg transition-colors hover:bg-white/5"
                          style={{ color: T.muted }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            isIncome
                              ? setStreamToDelete(entry.data as Stream)
                              : setExpenseToDelete(entry.data as Expense)
                          }
                          disabled={deleteExpenseMutation.isPending || deleteStreamMutation.isPending}
                          className="flex-shrink-0 p-1.5 rounded-lg transition-colors hover:bg-red-500/10 disabled:opacity-40"
                          style={{ color: RED }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Table view ──────────────────────────────────────────── */}
      {!isLoading && filteredEntries.length > 0 && viewMode === "table" && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  {["Type", "Date", "Name", "Category", "Amount", ""].map((h) => (
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
                {filteredEntries.map((entry) => {
                  const isIncome = entry.kind === "income";
                  const color = isIncome ? G : RED;
                  const sign = isIncome ? "+" : "−";
                  const data = entry.data;
                  return (
                    <tr
                      key={`${entry.kind}-${entry.id}`}
                      className="border-b border-white/[0.05] last:border-b-0 transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold"
                          style={{ background: `${color}14`, color, border: `1px solid ${color}30` }}
                        >
                          {isIncome ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {isIncome ? "Income" : "Expense"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[13px] font-mono whitespace-nowrap" style={{ color: T.muted }}>
                        {formatDate(entry.date.toISOString())}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-[13px] font-bold truncate max-w-[260px]" style={{ color: T.bright }}>{data.name}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        {entry.kind === "expense" ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                            style={{ background: "rgba(255,255,255,0.05)", color: T.body }}
                          >
                            {getCategoryEmoji(entry.data.category)} {entry.data.category}
                          </span>
                        ) : (
                          <span className="text-[12px]" style={{ color: T.dim }}>—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-[14px] font-extrabold font-mono whitespace-nowrap" style={{ color }}>
                        {sign}{formatCurrency(convert(data.amount, data.currency), defaultCurrency)}
                        {data.currency !== defaultCurrency && (
                          <span className="text-[11px] font-medium ml-1.5 opacity-50">
                            {formatCurrency(data.amount, data.currency)}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              isIncome
                                ? openEditStream(entry.data as unknown as Parameters<typeof openEditStream>[0])
                                : setEditingExpense(entry.data as Expense)
                            }
                            className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
                            style={{ color: T.muted }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              isIncome
                                ? setStreamToDelete(entry.data as Stream)
                                : setExpenseToDelete(entry.data as Expense)
                            }
                            disabled={deleteExpenseMutation.isPending || deleteStreamMutation.isPending}
                            className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 disabled:opacity-40"
                            style={{ color: RED }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Add/Edit Expense Modal ─────────────────────────────── */}
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

      {/* ── Delete expense confirm ─────────────────────────────── */}
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
                    color: RED,
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

      {/* ── Delete stream confirm ──────────────────────────────── */}
      <AnimatePresence>
        {streamToDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70" onClick={() => !deleteStreamMutation.isPending && setStreamToDelete(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-sm rounded-2xl p-6 shadow-2xl"
              style={{ background: "linear-gradient(145deg, #111 0%, #0d0d0d 100%)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.2)" }}>
                  <Trash2 className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold" style={{ color: T.bright }}>Remove income entry?</h3>
                  <p className="text-[12px] font-medium mt-0.5" style={{ color: T.muted }}>Cannot be undone</p>
                </div>
              </div>
              <p className="text-[13px] mb-5" style={{ color: T.body }}>
                <span className="font-semibold" style={{ color: T.bright }}>&ldquo;{streamToDelete.name}&rdquo;</span>
                {` (${formatCurrency(convert(streamToDelete.amount, streamToDelete.currency), defaultCurrency)})`}
                {" "}will be permanently removed from your treasury.
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStreamToDelete(null)} disabled={deleteStreamMutation.isPending}
                  className="flex-1 h-11 rounded-xl border font-semibold text-[13px] transition-all hover:bg-white/5 disabled:opacity-50"
                  style={{ borderColor: "rgba(255,255,255,0.12)", color: T.body }}>
                  Cancel
                </button>
                <button type="button" onClick={handleStreamDeleteConfirm} disabled={deleteStreamMutation.isPending}
                  className="flex-1 h-11 rounded-xl font-bold text-[13px] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "rgba(248,113,113,0.15)", color: RED, border: "1px solid rgba(248,113,113,0.25)" }}>
                  {deleteStreamMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Import Modal ───────────────────────────────────────── */}
      <ImportExpensesModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        organizationId={organizationId}
      />
    </div>
    </TooltipProvider>
  );
}
