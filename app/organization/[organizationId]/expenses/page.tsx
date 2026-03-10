"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useGetExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from "@/features/expenses/hooks/use-create-expense";
import { Loader2, Plus, Receipt } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";
import { Card, SectionLabel, Btn, T, A, Icons } from "@/lib/splito-design";

export default function OrganizationExpensesPage() {
  const params = useParams();
  const organizationId = params?.organizationId as string;
  const { user } = useAuthStore();
  const { data, isLoading } = useGetExpenses(organizationId);
  const expenses = (data as { expenses?: Array<{ id: string; name: string; amount: number; currency: string; expenseDate: string; category: string; paidBy?: string }> })?.expenses ?? [];
  const createExpenseMutation = useCreateExpense(organizationId);
  const updateExpenseMutation = useUpdateExpense(organizationId);
  const deleteExpenseMutation = useDeleteExpense(organizationId);
  const [modalOpen, setModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<typeof expenses[0] | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<typeof expenses[0] | null>(null);
  const [form, setForm] = useState({ name: "", amount: "", currency: "USD", expenseDate: new Date().toISOString().slice(0, 10) });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const thisMonthExpenses = expenses
    .filter((e) => new Date(e.expenseDate) >= startOfMonth)
    .reduce((sum, e) => sum + e.amount, 0);

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
          payload: {
            name: form.name.trim(),
            category: "Business",
            amount,
            splitType: "EXACT",
            currency: form.currency,
            participants: [{ userId: user.id, amount }],
            expenseDate: form.expenseDate,
          },
        },
        {
          onSuccess: () => {
            setExpenseToEdit(null);
            setForm({ name: "", amount: "", currency: "USD", expenseDate: new Date().toISOString().slice(0, 10) });
          },
          onError: (err: Error) => toast.error(err?.message ?? "Failed to update expense"),
        }
      );
      return;
    }
    createExpenseMutation.mutate(
      {
        name: form.name.trim(),
        category: "Business",
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
          setModalOpen(false);
          setForm({ name: "", amount: "", currency: "USD", expenseDate: new Date().toISOString().slice(0, 10) });
        },
        onError: (err: Error) => toast.error(err?.message ?? "Failed to add expense"),
      }
    );
  };

  const openEditModal = (exp: typeof expenses[0]) => {
    setExpenseToEdit(exp);
    setForm({
      name: exp.name,
      amount: String(exp.amount),
      currency: exp.currency,
      expenseDate: exp.expenseDate ? new Date(exp.expenseDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    });
  };

  const handleDeleteConfirm = () => {
    if (!expenseToDelete) return;
    deleteExpenseMutation.mutate(expenseToDelete.id, {
      onSettled: () => setExpenseToDelete(null),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <SectionLabel>Expenses</SectionLabel>
        <Btn
          onClick={() => setModalOpen(true)}
          style={{ background: A, color: "#0a0a0a", fontWeight: 700 }}
        >
          <Plus className="h-4 w-4" />
          Add expense
        </Btn>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <p className="text-sm font-medium mb-1" style={{ color: T.muted }}>Total expenses</p>
          <p className="text-2xl font-bold text-white">
            {isLoading ? "—" : formatCurrency(totalExpenses, "USD")}
          </p>
        </Card>
        <Card className="p-4 sm:p-5">
          <p className="text-sm font-medium mb-1" style={{ color: T.muted }}>This month</p>
          <p className="text-2xl font-bold text-white">
            {isLoading ? "—" : formatCurrency(thisMonthExpenses, "USD")}
          </p>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-white/50" />
        </div>
      ) : expenses.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center">
          <Receipt className="h-12 w-12 mx-auto mb-3 opacity-40" style={{ color: T.muted }} />
          <p className="text-[15px] font-semibold mb-4" style={{ color: T.muted }}>No expenses logged yet.</p>
          <p className="text-sm mb-4" style={{ color: T.sub }}>Add expenses you pay for the business (e.g. subscriptions, tools).</p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold"
            style={{ background: A, color: "#0a0a0a" }}
          >
            <Plus className="h-4 w-4" /> Add expense
          </button>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-wider" style={{ color: T.muted }}>Logged expenses</h2>
          {expenses.map((exp) => (
            <Card key={exp.id} className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold" style={{ color: T.bright }}>{exp.name}</p>
                  <p className="text-sm mt-1" style={{ color: T.muted }}>
                    {formatCurrency(exp.amount, exp.currency)}
                    {exp.expenseDate && ` · ${new Date(exp.expenseDate).toLocaleDateString()} · ${exp.category}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Btn variant="ghost" onClick={() => openEditModal(exp)} style={{ padding: "6px 12px", fontSize: 12 }}>
                    Edit
                  </Btn>
                  <Btn
                    variant="danger"
                    onClick={() => setExpenseToDelete(exp)}
                    style={{ padding: "6px 12px", fontSize: 12 }}
                  >
                    {Icons.trash({ size: 12 })} Delete
                  </Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {(modalOpen || expenseToEdit) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={() => {
              if (expenseToEdit) setExpenseToEdit(null);
              else setModalOpen(false);
              setForm({ name: "", amount: "", currency: "USD", expenseDate: new Date().toISOString().slice(0, 10) });
            }}
          />
          <div
            className="relative z-10 w-full max-w-md rounded-2xl p-6 shadow-xl"
            style={{ background: "linear-gradient(145deg, #111 0%, #0d0d0d 100%)", border: "1px solid rgba(255,255,255,0.08)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-4">{expenseToEdit ? "Edit expense" : "Log expense"}</h3>
            <p className="text-sm mb-4" style={{ color: T.muted }}>
              {expenseToEdit ? "Update the expense details below." : "Record an expense you paid for the business (e.g. subscription, tool, one-off cost)."}
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: T.soft }}>Description</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Software subscription"
                  className="w-full rounded-xl px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/40 outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: T.soft }}>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                  placeholder="0.00"
                  className="w-full rounded-xl px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/40 outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: T.soft }}>Currency</label>
                <input
                  type="text"
                  value={form.currency}
                  onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                  placeholder="USD"
                  className="w-full rounded-xl px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/40 outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: T.soft }}>Date</label>
                <input
                  type="date"
                  value={form.expenseDate}
                  onChange={(e) => setForm((p) => ({ ...p, expenseDate: e.target.value }))}
                  className="w-full rounded-xl px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] text-white outline-none focus:border-white/20"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Btn
                  variant="ghost"
                  className="flex-1"
                  onClick={() => {
                    if (expenseToEdit) setExpenseToEdit(null);
                    else setModalOpen(false);
                    setForm({ name: "", amount: "", currency: "USD", expenseDate: new Date().toISOString().slice(0, 10) });
                  }}
                >
                  Cancel
                </Btn>
                <button
                  type="submit"
                  disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending}
                  className="flex-1 rounded-xl py-2.5 font-semibold text-sm disabled:opacity-50"
                  style={{ background: A, color: "#0a0a0a" }}
                >
                  {updateExpenseMutation.isPending || createExpenseMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : expenseToEdit ? (
                    "Save changes"
                  ) : (
                    "Add expense"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {expenseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70" onClick={() => setExpenseToDelete(null)} />
          <div
            className="relative z-10 w-full max-w-sm rounded-2xl p-6 shadow-xl"
            style={{ background: "linear-gradient(145deg, #111 0%, #0d0d0d 100%)", border: "1px solid rgba(255,255,255,0.08)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-2">Delete expense?</h3>
            <p className="text-sm mb-4" style={{ color: T.muted }}>
              &ldquo;{expenseToDelete.name}&rdquo; ({formatCurrency(expenseToDelete.amount, expenseToDelete.currency)}) will be removed. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Btn variant="ghost" className="flex-1" onClick={() => setExpenseToDelete(null)}>
                Cancel
              </Btn>
              <Btn
                variant="danger"
                className="flex-1"
                onClick={handleDeleteConfirm}
                disabled={deleteExpenseMutation.isPending}
              >
                {deleteExpenseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Delete"}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
