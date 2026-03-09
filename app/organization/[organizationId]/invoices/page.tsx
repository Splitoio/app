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
import { Loader2, Eye, Clock, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";
import { InvoiceReviewModal } from "@/components/invoice-review-modal";
import type { Invoice } from "@/features/business/api/client";
import { Card, SectionLabel, Btn, T, Icons, A } from "@/lib/splito-design";

const PAYABLE_STATUSES = ["APPROVED", "OVERDUE", "SENT"] as const;
const APPROVAL_STATUS = "SENT";
const PREVIOUS_STATUSES = ["PAID", "CLEARED", "DECLINED"] as const;

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
    if (approvedOnly.length === 0) {
      toast.error("No approved invoices to pay");
      return;
    }
    approvedOnly.forEach((inv) => {
      markPaidMutation.mutate(inv.id, {
        onSuccess: () => toast.success(`Marked as paid: ${formatCurrencyLocal(inv.amount, inv.currency)}`),
        onError: () => toast.error(`Failed to mark invoice as paid`),
      });
    });
  };

  const canPayAny = pendingToPay.some((i) => i.status === "APPROVED");
  const paymentsOverdueCount = pendingToPay.filter((i) => i.status === "APPROVED" || i.status === "OVERDUE").length;
  const approvalPastDueCount = approvalRequests.filter((i) => new Date(i.dueDate) < new Date()).length;

  return (
    <div className="space-y-6 sm:space-y-8">
      <SectionLabel>Invoices</SectionLabel>

      {/* Pending Invoices (to pay) */}
      <Card id="pending-invoices" className="overflow-hidden scroll-mt-4">
        <div className="p-4 sm:p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-red-400/90" />
            <h2 className="text-lg font-semibold text-white">Pending invoices</h2>
          </div>
          <p className="text-sm mb-4" style={{ color: T.muted }}>
            Invoices that need to be paid
          </p>
          {isInvoicesLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-white/50" />
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <p className="text-2xl font-bold text-white">
                  Total: {formatCurrencyLocal(pendingTotal, currencyFirst)}
                </p>
                {isAdmin && canPayAny && (
                  <Btn
                    onClick={handlePayAll}
                    disabled={markPaidMutation.isPending}
                    style={{ background: A, color: "#0a0a0a", fontWeight: 700 }}
                  >
                    {markPaidMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Pay all"
                    )}
                  </Btn>
                )}
              </div>

              {pendingToPay.length === 0 && !showPreviousInvoices && (
                <p className="text-sm py-2" style={{ color: T.muted }}>
                  No pending invoices to pay.
                </p>
              )}

              {pendingToPay.length > 0 && (
                <div className="mt-4 space-y-3">
                  {pendingToPay.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                    >
                      <div className="flex gap-3 flex-1 min-w-0">
                        {inv.imageUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedImage({
                                url: inv.imageUrl!,
                                description: inv.description || `Invoice — ${formatCurrencyLocal(inv.amount, inv.currency)}`,
                              })
                            }
                            className="relative h-16 w-20 flex-shrink-0 rounded-lg overflow-hidden bg-white/[0.05] border border-white/[0.08] cursor-pointer"
                          >
                            <Image src={inv.imageUrl} alt="Invoice" fill className="object-cover" sizes="80px" />
                          </button>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-[#f5f5f5]">
                            {inv.issuer?.name || inv.issuer?.email || "Member"} — {formatCurrencyLocal(inv.amount, inv.currency)}
                          </p>
                          <p className="text-sm mt-0.5" style={{ color: T.muted }}>
                            Due {new Date(inv.dueDate).toLocaleDateString()} · {inv.status}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isAdmin && inv.status === "APPROVED" && (
                          <Btn
                            variant="primary"
                            onClick={() =>
                              markPaidMutation.mutate(inv.id, {
                                onSuccess: () => toast.success("Marked as paid"),
                                onError: () => toast.error("Failed to mark as paid"),
                              })
                            }
                            disabled={markPaidMutation.isPending}
                            style={{ padding: "6px 14px", fontSize: 12, background: A, color: "#0a0a0a" }}
                          >
                            Pay
                          </Btn>
                        )}
                        {inv.issuerId === user?.id && (inv.status === "DRAFT" || inv.status === "SENT") && (
                          <>
                            <Btn variant="ghost" onClick={() => setInvoiceToEdit({ id: inv.id, amount: inv.amount, currency: inv.currency, dueDate: inv.dueDate, description: inv.description ?? null, imageUrl: inv.imageUrl ?? null })} style={{ padding: "6px 12px", fontSize: 12 }}>
                              Edit
                            </Btn>
                            {inv.status === "DRAFT" && (
                              <Btn
                                variant="danger"
                                onClick={() =>
                                  deleteInvoiceMutation.mutate(inv.id, {
                                    onSuccess: () => toast.success("Deleted"),
                                    onError: () => toast.error("Failed to delete"),
                                  })
                                }
                                disabled={deleteInvoiceMutation.isPending}
                                style={{ padding: "6px 12px", fontSize: 12 }}
                              >
                                {Icons.trash({ size: 12 })} Delete
                              </Btn>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowPreviousInvoices((v) => !v)}
                className="mt-4 flex items-center gap-2 text-sm font-medium"
                style={{ color: T.muted }}
              >
                {showPreviousInvoices ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showPreviousInvoices ? "Hide previous invoices" : "Show previous invoices"}
              </button>

              {showPreviousInvoices && previousInvoices.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wider" style={{ color: T.muted }}>
                    Previous (paid / cleared / declined)
                  </p>
                  {previousInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                    >
                      <div className="flex gap-3 flex-1 min-w-0">
                        {inv.imageUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedImage({
                                url: inv.imageUrl!,
                                description: inv.description || `Invoice — ${formatCurrencyLocal(inv.amount, inv.currency)}`,
                              })
                            }
                            className="relative h-14 w-18 flex-shrink-0 rounded-lg overflow-hidden bg-white/[0.05]"
                          >
                            <Image src={inv.imageUrl} alt="" fill className="object-cover" sizes="72px" />
                          </button>
                        )}
                        <div>
                          <p className="font-medium text-white/90">
                            {inv.issuer?.name || inv.issuer?.email || "Member"} — {formatCurrencyLocal(inv.amount, inv.currency)}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: T.muted }}>
                            {new Date(inv.dueDate).toLocaleDateString()} · {inv.status}
                          </p>
                        </div>
                      </div>
                      {isAdmin && (inv.status === "PAID" || inv.status === "APPROVED" || inv.status === "DECLINED") && (
                        <Btn
                          variant="ghost"
                          onClick={() =>
                            clearInvoiceMutation.mutate(inv.id, {
                              onSuccess: () => toast.success("Cleared"),
                              onError: () => toast.error("Failed to clear"),
                            })
                          }
                          disabled={clearInvoiceMutation.isPending}
                          style={{ padding: "6px 12px", fontSize: 12 }}
                        >
                          Clear
                        </Btn>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {showPreviousInvoices && previousInvoices.length === 0 && (
                <p className="mt-4 text-sm" style={{ color: T.muted }}>No previous invoices.</p>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Approval requests (admin) */}
      {isAdmin && (
        <Card id="approval-requests" className="overflow-hidden scroll-mt-4">
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-amber-400/90" />
              <h2 className="text-lg font-semibold text-white">Approval requests</h2>
            </div>
            <p className="text-sm mb-4" style={{ color: T.muted }}>
              Invoices waiting for your approval
            </p>
            {approvalRequests.length === 0 ? (
              <p className="text-sm py-2" style={{ color: T.muted }}>No pending approval requests.</p>
            ) : (
              <div className="space-y-3">
                {approvalRequests.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                  >
                    <div className="flex gap-3 flex-1 min-w-0">
                      {inv.imageUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedImage({
                              url: inv.imageUrl!,
                              description: inv.description || `Invoice — ${formatCurrencyLocal(inv.amount, inv.currency)}`,
                            })
                          }
                          className="relative h-16 w-20 flex-shrink-0 rounded-lg overflow-hidden bg-white/[0.05] border border-white/[0.08] cursor-pointer"
                        >
                          <Image src={inv.imageUrl} alt="Invoice" fill className="object-cover" sizes="80px" />
                        </button>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-[#f5f5f5]">
                          {inv.issuer?.name || inv.issuer?.email || "Member"} — {formatCurrencyLocal(inv.amount, inv.currency)}
                        </p>
                        <p className="text-sm mt-0.5" style={{ color: T.muted }}>
                          Due {new Date(inv.dueDate).toLocaleDateString()}
                        </p>
                        {inv.dueDate && new Date(inv.dueDate) < new Date() && (
                          <p className="text-xs text-red-400/90 mt-0.5">Past due</p>
                        )}
                      </div>
                    </div>
                    <Btn
                      variant="ghost"
                      onClick={() => setInvoiceToReview(inv)}
                      style={{ padding: "6px 14px", fontSize: 12 }}
                    >
                      <Eye className="h-3.5 w-3.5" /> Review
                    </Btn>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      <InvoiceReviewModal
        isOpen={!!invoiceToReview}
        onClose={() => setInvoiceToReview(null)}
        invoice={invoiceToReview}
        onApprove={() => {
          if (!invoiceToReview) return;
          approveInvoiceMutation.mutate(invoiceToReview.id, {
            onSuccess: () => {
              toast.success("Invoice approved");
              setInvoiceToReview(null);
            },
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

      {invoices.length === 0 && !isInvoicesLoading && (
        <Card className="p-8 sm:p-12 text-center">
          <p className="text-[15px] font-semibold mb-2" style={{ color: T.muted }}>
            No invoices yet.
          </p>
          {!isAdmin && (
            <button
              onClick={openAddInvoice}
              className="mt-2 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all"
              style={{ background: A, color: "#0a0a0a" }}
            >
              Raise an invoice
            </button>
          )}
        </Card>
      )}
    </div>
  );
}
