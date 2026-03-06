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
} from "@/features/business/hooks/use-invoices";
import { useOrganizationOrg } from "@/contexts/organization-org-context";
import { Loader2, Eye } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";
import { InvoiceReviewModal } from "@/components/invoice-review-modal";
import type { Invoice } from "@/features/business/api/client";
import { Card, SectionLabel, Btn, T, Icons, A } from "@/lib/splito-design";

export default function OrganizationInvoicesPage() {
  const params = useParams();
  const organizationId = params?.organizationId as string;
  const { user } = useAuthStore();
  const { isAdmin, openAddInvoice, openDecline, setInvoiceToEdit, setExpandedImage } = useOrganizationOrg();
  const { data: invoices = [], isLoading: isInvoicesLoading } = useGetInvoicesByOrganization(organizationId);
  const approveInvoiceMutation = useApproveInvoice();
  const declineInvoiceMutation = useDeclineInvoice();
  const clearInvoiceMutation = useClearInvoice();
  const updateInvoiceMutation = useUpdateInvoice();
  const deleteInvoiceMutation = useDeleteInvoice();
  const [invoiceToReview, setInvoiceToReview] = useState<Invoice | null>(null);

  const formatCurrencyLocal = (amount: number, currency: string) => formatCurrency(amount, currency);

  return (
    <div className="space-y-4 sm:space-y-5">
      <SectionLabel>Invoices</SectionLabel>
      {isInvoicesLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-white/50" />
        </div>
      ) : invoices.length > 0 ? (
        <Card className="p-0 overflow-hidden">
          {invoices.map((inv, idx) => (
            <div
              key={inv.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-white/[0.06] last:border-b-0"
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
                    className="relative h-20 w-28 flex-shrink-0 rounded-xl overflow-hidden bg-white/[0.05] border border-white/[0.08] cursor-pointer hover:ring-2 hover:ring-white/20 transition-shadow"
                  >
                    <Image src={inv.imageUrl} alt="Invoice" fill className="object-cover" sizes="112px" />
                  </button>
                )}
                <div className="min-w-0">
                  <p className="font-medium text-[#f5f5f5]">
                    {inv.issuer?.name || inv.issuer?.email || "Member"} — {formatCurrencyLocal(inv.amount, inv.currency)}
                  </p>
                  <p className="text-sm mt-1" style={{ color: T.muted }}>
                    Due {new Date(inv.dueDate).toLocaleDateString()} · {inv.status}
                  </p>
                  {inv.description && <p className="text-sm mt-1" style={{ color: T.sub }}>{inv.description}</p>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isAdmin && (inv.status === "DRAFT" || inv.status === "SENT") && (
                  <Btn variant="ghost" onClick={() => setInvoiceToReview(inv)} style={{ padding: "6px 12px", fontSize: 12 }}>
                    <Eye className="h-3.5 w-3.5" /> View
                  </Btn>
                )}
                {isAdmin && (inv.status === "APPROVED" || inv.status === "DECLINED" || inv.status === "PAID") && (
                  <Btn
                    variant="ghost"
                    onClick={() =>
                      clearInvoiceMutation.mutate(inv.id, {
                        onSuccess: () => toast.success("Invoice cleared"),
                        onError: () => toast.error("Failed to clear"),
                      })
                    }
                    disabled={clearInvoiceMutation.isPending}
                    style={{ padding: "6px 12px", fontSize: 12 }}
                  >
                    Clear
                  </Btn>
                )}
                {inv.issuerId === user?.id && (inv.status === "DRAFT" || inv.status === "SENT") && (
                  <>
                    <Btn
                      variant="ghost"
                      onClick={() =>
                        setInvoiceToEdit({
                          id: inv.id,
                          amount: inv.amount,
                          currency: inv.currency,
                          dueDate: inv.dueDate,
                          description: inv.description ?? null,
                          imageUrl: inv.imageUrl ?? null,
                        })
                      }
                      style={{ padding: "6px 12px", fontSize: 12 }}
                    >
                      Edit
                    </Btn>
                    {inv.status === "DRAFT" && (
                      <Btn
                        variant="danger"
                        onClick={() =>
                          deleteInvoiceMutation.mutate(inv.id, {
                            onSuccess: () => toast.success("Invoice deleted"),
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
        </Card>
      ) : null}

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
