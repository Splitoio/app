"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useGetExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from "@/features/expenses/hooks/use-create-expense";
import { Loader2, Plus, Receipt, Pencil, Trash2, Calendar, Tag } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";
import { Card, SectionLabel, T, A } from "@/lib/splito-design";
import { motion, AnimatePresence } from "framer-motion";

type Expense = { id: string; name: string; amount: number; currency: string; expenseDate: string; category: string; paidBy?: string };

const CATEGORIES = ["Business", "Software", "Hardware", "Travel", "Marketing", "Office", "Other"];

export default function OrganizationExpensesPage() {
  const params = useParams();
  const organizationId = params?.organizationId as string;
  const { user } = useAuthStore();
  const { data, isLoading } = useGetExpenses(organizationId);
  const expenses = (data as { expenses?: Expense[] })?.expenses ?? [];
  const createExpenseMutation = useCreateExpense(organizationId);
  const updateExpenseMutation = useUpdateExpense(organizationId);
  const deleteExpenseMutation = useDeleteExpense(organizationId);
  const [modalOpen, setModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [form, setForm] = useState({ name: "", amount: "", currency: "USD", category: "Business", expenseDate: new Date().toISOString().slice(0, 10) });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const thisMonthExpenses = expenses
    .filter((e) => new Date(e.expenseDate) >= startOfMonth)
    .reduce((sum, e) => sum + e.amount, 0);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.name.trim() || isNaN(amount) || amount <= 0) {
      toast.error("Please enter a name and valid amount");
      return;
    }
    if (!user?.id) return;
    if (expenseToEdit) {
      updateExpenseMutation.mutate(
        {
          expenseId: expenseToEdit.id,
          payload: { name: form.name.trim(), category: form.category, amount, splitType: "EXACT", currency: form.currency, participants: [{ userId: user.id, amount }], expenseDate: form.expenseDate },
        },
        {
          onSuccess: () => {
            toast.success("Expense updated");
            setExpenseToEdit(null);
            setForm({ name: "", amount: "", currency: "USD", category: "Business", expenseDate: new Date().toISOString().slice(0, 10) });
          },
          onError: (err: Error) => toast.error(err?.message ?? "Failed to update expense"),
        }
      );
      return;
    }
    createExpenseMutation.mutate(
      { name: form.name.trim(), category: form.category, amount, splitType: "EXACT", currency: form.currency, currencyType: "FIAT", timeLockIn: false, participants: [{ userId: user.id, amount }], paidBy: user.id, expenseDate: form.expenseDate },
      {
        onSuccess: () => {
          toast.success("Expense logged");
          setModalOpen(false);
          setForm({ name: "", amount: "", currency: "USD", category: "Business", expenseDate: new Date().toISOString().slice(0, 10) });
        },
        onError: (err: Error) => toast.error(err?.message ?? "Failed to add expense"),
      }
    );
  };

  const openEditModal = (exp: Expense) => {
    setExpenseToEdit(exp);
    setForm({
      name: exp.name,
      amount: String(exp.amount),
      currency: exp.currency,
      category: exp.category ?? "Business",
      expenseDate: exp.expenseDate ? new Date(exp.expenseDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    });
  };

  const handleDeleteConfirm = () => {
    if (!expenseToDelete) return;
    deleteExpenseMutation.mutate(expenseToDelete.id, {
      onSuccess: () => { toast.success("Expense deleted"); setExpenseToDelete(null); },
      onError: () => { toast.error("Failed to delete expense"); setExpenseToDelete(null); },
    });
  };

  const closeForm = () => {
    setExpenseToEdit(null);
    setModalOpen(false);
    setForm({ name: "", amount: "", currency: "USD", category: "Business", expenseDate: new Date().toISOString().slice(0, 10) });
  };

  return (
    <div className="w-full space-y-5 sm:space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] sm:text-[22px] font-extrabold tracking-[-0.02em] text-white">Expenses</h1>
          <p className="text-[12px] font-medium mt-0.5" style={{ color: T.muted }}>
            {isLoading ? "Loading…" : `${expenses.length} expense${expenses.length !== 1 ? "s" : ""} logged`}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-xl h-10 px-4 text-[13px] font-extrabold transition-all hover:opacity-90"
          style={{ background: A, color: "#0a0a0a" }}
        >
          <Plus className="h-4 w-4" /> Log expense
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
          <div className="text-[48px] mb-4">🧾</div>
          <h2 className="text-[16px] font-bold text-white mb-2">No expenses logged</h2>
          <p className="text-[13px] mb-5" style={{ color: T.muted }}>
            Record business expenses like subscriptions, tools, and one-off costs.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-extrabold transition-all hover:opacity-90"
            style={{ background: A, color: "#0a0a0a" }}
          >
            <Plus className="h-4 w-4" /> Log first expense
          </button>
        </div>
      )}

      {/* ── Summary hero ── */}
      {!isLoading && expenses.length > 0 && (
        <div
          className="rounded-2xl sm:rounded-3xl border border-white/[0.09] p-5 sm:p-7 mb-5 sm:mb-6"
          style={{ background: "linear-gradient(135deg, #141414 0%, #0f0f0f 100%)", boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)" }}
        >
          <div className="grid grid-cols-2 gap-0">
            <div className="min-w-0 pr-4 sm:pr-6 border-r border-white/[0.07]">
              <p className="text-[10px] font-semibold tracking-[0.06em] uppercase mb-1.5" style={{ color: T.dim }}>Total</p>
              <p className="text-[22px] sm:text-[24px] font-extrabold font-mono" style={{ color: "#F87171" }}>{formatCurrency(totalExpenses, "USD")}</p>
            </div>
            <div className="min-w-0 pl-4 sm:pl-6">
              <p className="text-[10px] font-semibold tracking-[0.06em] uppercase mb-1.5" style={{ color: T.dim }}>This month</p>
              <p className="text-[22px] sm:text-[24px] font-extrabold font-mono" style={{ color: "#22D3EE" }}>{formatCurrency(thisMonthExpenses, "USD")}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Expense list ── */}
      {!isLoading && expenses.length > 0 && (
        <div className="w-full mb-5 sm:mb-6">
          <SectionLabel className="mb-3">Expenses</SectionLabel>
          <Card className="w-full p-0 overflow-hidden">
          {expenses.map((exp) => (
            <div key={exp.id}
              className="w-full flex items-center gap-4 sm:gap-6 px-4 sm:px-6 py-4 border-b border-white/[0.06] last:border-b-0 hover:bg-white/[0.015] transition-colors"
            >
              {/* Icon */}
              <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}>
                <Receipt className="h-4 w-4" style={{ color: "#F87171" }} />
              </div>

              {/* Info - takes remaining space */}
              <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                <div className="min-w-0">
                  <p className="text-[14px] font-bold truncate" style={{ color: T.bright }}>{exp.name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {exp.category && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(255,255,255,0.06)", color: T.dim, border: "1px solid rgba(255,255,255,0.09)" }}>
                        <Tag className="h-2.5 w-2.5" /> {exp.category}
                      </span>
                    )}
                    {exp.expenseDate && (
                      <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: T.sub }}>
                        <Calendar className="h-2.5 w-2.5" /> {formatDate(exp.expenseDate)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                  <p className="text-[15px] sm:text-[16px] font-extrabold font-mono" style={{ color: "#F87171" }}>
                    {formatCurrency(exp.amount, exp.currency)}
                  </p>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={() => openEditModal(exp)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold border transition-all hover:bg-white/5"
                    style={{ borderColor: "rgba(255,255,255,0.1)", color: T.muted }}>
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                  <button type="button" onClick={() => setExpenseToDelete(exp)}
                    disabled={deleteExpenseMutation.isPending}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all hover:bg-red-500/10 disabled:opacity-50"
                    style={{ color: "#F87171" }}>
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          </Card>
        </div>
      )}

      {/* ── Add/Edit Expense Modal ── */}
      <AnimatePresence>
        {(modalOpen || !!expenseToEdit) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70" onClick={closeForm} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-md rounded-2xl p-6 shadow-2xl"
              style={{ background: "linear-gradient(145deg, #111 0%, #0d0d0d 100%)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}>
                  <Receipt className="h-5 w-5" style={{ color: "#F87171" }} />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold" style={{ color: T.bright }}>
                    {expenseToEdit ? "Edit expense" : "Log expense"}
                  </h3>
                  <p className="text-[12px] font-medium mt-0.5" style={{ color: T.muted }}>
                    {expenseToEdit ? "Update the expense details" : "Record a business expense"}
                  </p>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5" style={{ color: T.soft }}>Description</label>
                  <input type="text" value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Software subscription"
                    className="w-full rounded-xl px-4 py-2.5 text-[13px] bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/30 outline-none focus:border-white/20 transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-semibold mb-1.5" style={{ color: T.soft }}>Amount</label>
                    <input type="number" step="0.01" min="0" value={form.amount}
                      onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                      placeholder="0.00"
                      className="w-full rounded-xl px-4 py-2.5 text-[13px] bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/30 outline-none focus:border-white/20 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold mb-1.5" style={{ color: T.soft }}>Currency</label>
                    <input type="text" value={form.currency}
                      onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value.toUpperCase() }))}
                      placeholder="USD"
                      className="w-full rounded-xl px-4 py-2.5 text-[13px] bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/30 outline-none focus:border-white/20 transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5" style={{ color: T.soft }}>Category</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                      <button key={cat} type="button"
                        onClick={() => setForm((p) => ({ ...p, category: cat }))}
                        className="px-3 py-1 rounded-lg text-[12px] font-semibold border transition-all"
                        style={form.category === cat
                          ? { background: `${A}18`, color: A, borderColor: `${A}30` }
                          : { background: "transparent", color: T.muted, borderColor: "rgba(255,255,255,0.1)" }}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5" style={{ color: T.soft }}>Date</label>
                  <input type="date" value={form.expenseDate}
                    onChange={(e) => setForm((p) => ({ ...p, expenseDate: e.target.value }))}
                    className="w-full rounded-xl px-4 py-2.5 text-[13px] bg-white/[0.05] border border-white/[0.1] text-white outline-none focus:border-white/20 transition-colors" />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={closeForm}
                    className="flex-1 h-11 rounded-xl border font-semibold text-[13px] transition-all hover:bg-white/5"
                    style={{ borderColor: "rgba(255,255,255,0.12)", color: T.body }}>
                    Cancel
                  </button>
                  <button type="submit"
                    disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending}
                    className="flex-1 h-11 rounded-xl font-bold text-[13px] transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: A, color: "#0a0a0a" }}>
                    {(createExpenseMutation.isPending || updateExpenseMutation.isPending)
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : expenseToEdit ? "Save changes" : "Log expense"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete confirm modal ── */}
      <AnimatePresence>
        {expenseToDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70" onClick={() => !deleteExpenseMutation.isPending && setExpenseToDelete(null)} />
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
                  <h3 className="text-[16px] font-bold" style={{ color: T.bright }}>Delete expense?</h3>
                  <p className="text-[12px] font-medium mt-0.5" style={{ color: T.muted }}>Cannot be undone</p>
                </div>
              </div>
              <p className="text-[13px] mb-5" style={{ color: T.body }}>
                <span className="font-semibold" style={{ color: T.bright }}>&ldquo;{expenseToDelete.name}&rdquo;</span>
                {" "}({formatCurrency(expenseToDelete.amount, expenseToDelete.currency)}) will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setExpenseToDelete(null)} disabled={deleteExpenseMutation.isPending}
                  className="flex-1 h-11 rounded-xl border font-semibold text-[13px] transition-all hover:bg-white/5 disabled:opacity-50"
                  style={{ borderColor: "rgba(255,255,255,0.12)", color: T.body }}>
                  Cancel
                </button>
                <button type="button" onClick={handleDeleteConfirm} disabled={deleteExpenseMutation.isPending}
                  className="flex-1 h-11 rounded-xl font-bold text-[13px] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "rgba(248,113,113,0.15)", color: "#F87171", border: "1px solid rgba(248,113,113,0.25)" }}>
                  {deleteExpenseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
