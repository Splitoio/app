"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { useAuthStore } from "@/stores/authStore";
import {
  useGetInvoicesByOrganization,
  useUpdateInvoice,
  useDeleteInvoice,
  useApproveInvoice,
  useDeclineInvoice,
  useClearInvoice,
  useMarkInvoiceAsPaid,
} from "@/features/business/hooks/use-invoices";
import { useOrganizationOrg } from "@/contexts/organization-org-context";
import { Loader2, Eye, Clock, FileText, ChevronDown, ChevronUp, Plus, CheckCircle2, XCircle, AlertCircle, Receipt } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";
import { InvoiceReviewModal } from "@/components/invoice-review-modal";
import type { Invoice } from "@/features/business/api/client";
import { Card, SectionLabel, Btn, T, Icons, A } from "@/lib/splito-design";

const PAYABLE_STATUSES = ["DRAFT", "APPROVED", "OVERDUE", "SENT"] as const;
const APPROVAL_STATUS = "SENT";
const PREVIOUS_STATUSES = ["PAID", "CLEARED", "DECLINED"] as const;

function statusBadge(status: string) {
  switch (status) {
    case "APPROVED": return { label: "Approved", bg: "rgba(52,211,153,0.15)", color: "#34D399", border: "rgba(52,211,153,0.25)" };
    case "OVERDUE":  return { label: "Overdue",  bg: "rgba(248,113,113,0.15)", color: "#F87171", border: "rgba(248,113,113,0.25)" };
    case "SENT":     return { label: "Sent",     bg: "rgba(34,211,238,0.15)", color: "#22D3EE", border: "rgba(34,211,238,0.25)" };
    case "PAID":     return { label: "Paid",     bg: "rgba(52,211,153,0.1)", color: "#34D399", border: "rgba(52,211,153,0.2)" };
    case "CLEARED":  return { label: "Cleared",  bg: "rgba(255,255,255,0.06)", color: "#aaa", border: "rgba(255,255,255,0.1)" };
    case "DECLINED": return { label: "Declined", bg: "rgba(248,113,113,0.1)", color: "#F87171", border: "rgba(248,113,113,0.2)" };
    case "DRAFT":    return { label: "Draft",    bg: "rgba(255,255,255,0.05)", color: "#888", border: "rgba(255,255,255,0.08)" };
    default:         return { label: status,     bg: "rgba(255,255,255,0.05)", color: "#888", border: "rgba(255,255,255,0.08)" };
  }
}

function StatusPill({ status }: { status: string }) {
  const s = statusBadge(status);
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

function InvoiceRow({
  inv,
  isAdmin,
  userId,
  onPay,
  onEdit,
  onDelete,
  onReview,
  onClear,
  isPaying,
  isDeleting,
  isClearing,
  setExpandedImage,
}: {
  inv: Invoice;
  isAdmin: boolean;
  userId?: string;
  onPay?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onReview?: () => void;
  onClear?: () => void;
  isPaying?: boolean;
  isDeleting?: boolean;
  isClearing?: boolean;
  setExpandedImage?: (v: { url: string; description: string }) => void;
}) {
  const isPastDue = inv.dueDate && new Date(inv.dueDate) < new Date();
  const isIssuer = inv.issuerId === userId;

  return (
    <div className="w-full flex items-center gap-3 sm:gap-6 px-4 sm:px-6 py-4 border-b border-white/[0.06] last:border-b-0 hover:bg-white/[0.015] transition-colors">
      {/* Receipt image thumbnail */}
      {inv.imageUrl ? (
        <button type="button"
          onClick={() => setExpandedImage?.({ url: inv.imageUrl!, description: inv.description || `Invoice — ${formatCurrency(inv.amount, inv.currency)}` })}
          className="relative h-12 w-14 flex-shrink-0 rounded-xl overflow-hidden border border-white/[0.08] cursor-pointer hover:border-white/20 transition-colors">
          <Image src={inv.imageUrl} alt="Invoice" fill className="object-cover" sizes="56px" />
        </button>
      ) : (
        <div className="h-12 w-12 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <Receipt className="h-5 w-5" style={{ color: T.dim }} />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <p className="text-[14px] font-bold truncate" style={{ color: T.bright }}>
              {inv.issuer?.name || inv.issuer?.email || "Member"}
            </p>
            <p className="text-[12px] mt-0.5 font-medium" style={{ color: T.muted }}>
              Due {new Date(inv.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              {isPastDue && inv.status !== "PAID" && inv.status !== "CLEARED" && (
                <span className="ml-1.5 text-red-400/80">· past due</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <p className="text-[16px] font-extrabold font-mono" style={{ color: T.bright }}>
              {formatCurrency(inv.amount, inv.currency)}
            </p>
            <StatusPill status={inv.status} />
          </div>
        </div>

        {/* Actions row */}
        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
          {isAdmin && inv.status === "APPROVED" && (
            <button onClick={onPay} disabled={isPaying}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: A, color: "#0a0a0a" }}>
              {isPaying ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              Pay
            </button>
          )}
          {onReview && (
            <button onClick={onReview}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold border transition-all hover:bg-white/5"
              style={{ borderColor: "rgba(255,255,255,0.12)", color: T.body }}>
              <Eye className="h-3 w-3" /> Review
            </button>
          )}
          {isIssuer && (inv.status === "DRAFT" || inv.status === "SENT") && onEdit && (
            <button onClick={onEdit}
              className="rounded-lg px-3 py-1.5 text-[12px] font-semibold border transition-all hover:bg-white/5"
              style={{ borderColor: "rgba(255,255,255,0.1)", color: T.muted }}>
              Edit
            </button>
          )}
          {isIssuer && inv.status === "DRAFT" && onDelete && (
            <button onClick={onDelete} disabled={isDeleting}
              className="rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all hover:bg-red-500/10 disabled:opacity-50"
              style={{ color: "#F87171" }}>
              {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}
            </button>
          )}
          {isAdmin && onClear && (inv.status === "PAID" || inv.status === "APPROVED" || inv.status === "DECLINED") && (
            <button onClick={onClear} disabled={isClearing}
              className="rounded-lg px-3 py-1.5 text-[12px] font-semibold border transition-all hover:bg-white/5 disabled:opacity-50"
              style={{ borderColor: "rgba(255,255,255,0.1)", color: T.muted }}>
              {isClearing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Clear"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OrganizationInvoicesPage() {
  const params = useParams();
  const organizationId = params?.organizationId as string;
  const { user } = useAuthStore();
  const { isAdmin, openAddInvoice, openDecline, setInvoiceToEdit, setExpandedImage } = useOrganizationOrg();
  const { data: invoices = [], isLoading: isInvoicesLoading } = useGetInvoicesByOrganization(organizationId);
  const approveInvoiceMutation = useApproveInvoice();
  const declineInvoiceMutation = useDeclineInvoice();
  const clearInvoiceMutation = useClearInvoice();
  const markPaidMutation = useMarkInvoiceAsPaid();
  const updateInvoiceMutation = useUpdateInvoice();
  const deleteInvoiceMutation = useDeleteInvoice();
  const [invoiceToReview, setInvoiceToReview] = useState<Invoice | null>(null);
  const [showPreviousInvoices, setShowPreviousInvoices] = useState(false);

  const formatCurrencyLocal = (amount: number, currency: string) => formatCurrency(amount, currency);

  const pendingToPay = invoices.filter((i) => PAYABLE_STATUSES.includes(i.status as typeof PAYABLE_STATUSES[number]));
  const approvalRequests = invoices.filter((i) => i.status === APPROVAL_STATUS);
  const previousInvoices = invoices.filter((i) => PREVIOUS_STATUSES.includes(i.status as typeof PREVIOUS_STATUSES[number]));

  const pendingTotal = pendingToPay.reduce((sum, i) => sum + i.amount, 0);
  const currencyFirst = pendingToPay[0]?.currency ?? invoices[0]?.currency ?? "USD";

  const handlePayAll = () => {
    const approvedOnly = pendingToPay.filter((i) => i.status === "APPROVED");
    if (approvedOnly.length === 0) { toast.error("No approved invoices to pay"); return; }
    approvedOnly.forEach((inv) => {
      markPaidMutation.mutate(inv.id, {
        onSuccess: () => toast.success(`Marked as paid: ${formatCurrencyLocal(inv.amount, inv.currency)}`),
        onError: () => toast.error(`Failed to mark invoice as paid`),
      });
    });
  };

  const canPayAny = pendingToPay.some((i) => i.status === "APPROVED");
  const paymentsOverdueCount = pendingToPay.filter((i) => i.status === "APPROVED" || i.status === "OVERDUE").length;

  if (isInvoicesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-white/30" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 sm:space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] sm:text-[22px] font-extrabold tracking-[-0.02em] text-white">Invoices</h1>
          <p className="text-[12px] font-medium mt-0.5" style={{ color: T.muted }}>
            {invoices.length} total · {pendingToPay.length} pending
          </p>
        </div>
        {!isAdmin && (
          <button onClick={openAddInvoice}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-extrabold transition-all hover:opacity-90"
            style={{ background: A, color: "#0a0a0a" }}>
            <Plus className="h-4 w-4" /> Raise Invoice
          </button>
        )}
      </div>

      {/* ── Empty state ── */}
      {invoices.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-[48px] mb-4">🧾</div>
          <h2 className="text-[16px] font-bold text-white mb-2">No invoices yet</h2>
          <p className="text-[13px] mb-5" style={{ color: T.muted }}>
            {isAdmin ? "Invoices raised by team members will appear here." : "Raise an invoice for your work."}
          </p>
          {!isAdmin && (
            <button onClick={openAddInvoice}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-extrabold transition-all hover:opacity-90"
              style={{ background: A, color: "#0a0a0a" }}>
              <Plus className="h-4 w-4" /> Raise invoice
            </button>
          )}
        </div>
      )}

      {/* ── Summary hero (admin, has invoices) ── */}
      {isAdmin && invoices.length > 0 && (
        <div
          className="rounded-2xl sm:rounded-3xl border border-white/[0.09] p-5 sm:p-7 mb-5 sm:mb-6"
          style={{ background: "linear-gradient(135deg, #141414 0%, #0f0f0f 100%)", boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)" }}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[11px] font-bold tracking-[0.08em] uppercase mb-1" style={{ color: T.muted }}>Outstanding</p>
              <p className="text-[32px] font-black font-mono tracking-[-0.02em]" style={{ color: paymentsOverdueCount > 0 ? "#F87171" : T.bright }}>
                {formatCurrencyLocal(pendingTotal, currencyFirst)}
              </p>
              <p className="text-[12px] font-medium mt-1" style={{ color: T.muted }}>
                {pendingToPay.length} pending · {paymentsOverdueCount} overdue
              </p>
            </div>
            {canPayAny && (
              <button onClick={handlePayAll} disabled={markPaidMutation.isPending}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-extrabold transition-all hover:opacity-90 disabled:opacity-50 mt-1"
                style={{ background: A, color: "#0a0a0a" }}>
                {markPaidMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Pay all approved
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Pending to pay ── */}
      {pendingToPay.length > 0 && (
        <div className="w-full mb-5 sm:mb-6">
          <SectionLabel className="mb-3">Active · {pendingToPay.length}</SectionLabel>
          <Card className="w-full p-0 overflow-hidden">
            {pendingToPay.map((inv) => (
              <InvoiceRow
                key={inv.id}
                inv={inv}
                isAdmin={!!isAdmin}
                userId={user?.id}
                onPay={() => markPaidMutation.mutate(inv.id, { onSuccess: () => toast.success("Marked as paid"), onError: () => toast.error("Failed") })}
                onEdit={() => setInvoiceToEdit({ id: inv.id, amount: inv.amount, currency: inv.currency, dueDate: inv.dueDate, description: inv.description ?? null, imageUrl: inv.imageUrl ?? null })}
                onDelete={() => deleteInvoiceMutation.mutate(inv.id, { onSuccess: () => toast.success("Deleted"), onError: () => toast.error("Failed to delete") })}
                isPaying={markPaidMutation.isPending}
                isDeleting={deleteInvoiceMutation.isPending}
                setExpandedImage={setExpandedImage}
              />
            ))}
          </Card>
        </div>
      )}

      {/* ── Approval requests (admin only) ── */}
      {isAdmin && approvalRequests.length > 0 && (
        <div className="w-full mb-5 sm:mb-6">
          <SectionLabel className="mb-3">Awaiting approval · {approvalRequests.length}</SectionLabel>
          <Card className="w-full p-0 overflow-hidden">
            {approvalRequests.map((inv) => (
              <InvoiceRow
                key={inv.id}
                inv={inv}
                isAdmin={!!isAdmin}
                userId={user?.id}
                onReview={() => setInvoiceToReview(inv)}
                setExpandedImage={setExpandedImage}
              />
            ))}
          </Card>
        </div>
      )}

      {/* ── History toggle ── */}
      {invoices.length > 0 && (
        <div className="mb-5 sm:mb-6">
          <SectionLabel className="mb-3">History</SectionLabel>
          <button
            type="button"
            onClick={() => setShowPreviousInvoices((v) => !v)}
            className="flex items-center gap-2 text-[13px] font-semibold transition-colors hover:text-white/70"
            style={{ color: T.muted }}
          >
            {showPreviousInvoices ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showPreviousInvoices ? "Hide history" : `Show history (${previousInvoices.length})`}
          </button>

          {showPreviousInvoices && (
            <div className="mt-3 w-full">
              {previousInvoices.length === 0 ? (
                <p className="text-[13px] py-2" style={{ color: T.muted }}>No previous invoices.</p>
              ) : (
                <Card className="w-full p-0 overflow-hidden">
                  {previousInvoices.map((inv) => (
                    <InvoiceRow
                      key={inv.id}
                      inv={inv}
                      isAdmin={!!isAdmin}
                      userId={user?.id}
                      onClear={() => clearInvoiceMutation.mutate(inv.id, { onSuccess: () => toast.success("Cleared"), onError: () => toast.error("Failed to clear") })}
                      isClearing={clearInvoiceMutation.isPending}
                      setExpandedImage={setExpandedImage}
                    />
                  ))}
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      <InvoiceReviewModal
        isOpen={!!invoiceToReview}
        onClose={() => setInvoiceToReview(null)}
        invoice={invoiceToReview}
        onApprove={() => {
          if (!invoiceToReview) return;
          approveInvoiceMutation.mutate(invoiceToReview.id, {
            onSuccess: () => { toast.success("Invoice approved"); setInvoiceToReview(null); },
            onError: () => toast.error("Failed to approve"),
          });
        }}
        onDecline={() => {
          if (!invoiceToReview) return;
          setInvoiceToReview(null);
          openDecline(invoiceToReview.id);
        }}
        isApproving={approveInvoiceMutation.isPending}
        isDeclining={declineInvoiceMutation.isPending}
      />
    </div>
  );
}
