"use client";

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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";

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

  const formatCurrencyLocal = (amount: number, currency: string) => formatCurrency(amount, currency);

  return (
    <div className="space-y-3 sm:space-y-4">
      {isInvoicesLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-white/50" />
        </div>
      ) : invoices.length > 0 ? (
        invoices.map((inv) => (
          <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl bg-white/[0.02]">
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
                  className="relative h-20 w-28 flex-shrink-0 rounded-lg overflow-hidden bg-white/5 cursor-pointer hover:ring-2 hover:ring-white/30 transition-shadow"
                >
                  <Image src={inv.imageUrl} alt="Invoice" fill className="object-cover" sizes="112px" />
                </button>
              )}
              <div className="min-w-0">
                <p className="text-white font-medium">
                  {inv.issuer?.name || inv.issuer?.email || "Member"} — {formatCurrencyLocal(inv.amount, inv.currency)}
                </p>
                <p className="text-white/60 text-sm">
                  Due {new Date(inv.dueDate).toLocaleDateString()} · {inv.status}
                </p>
                {inv.description && <p className="text-white/50 text-sm mt-1">{inv.description}</p>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isAdmin && (inv.status === "DRAFT" || inv.status === "SENT") && (
                <>
                  <button
                    onClick={() =>
                      approveInvoiceMutation.mutate(inv.id, {
                        onSuccess: () => toast.success("Invoice approved"),
                        onError: () => toast.error("Failed to approve"),
                      })
                    }
                    disabled={approveInvoiceMutation.isPending}
                    className="rounded-full border border-green-500/50 px-3 py-1.5 text-green-400 hover:bg-green-500/10 text-sm"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => openDecline(inv.id)}
                    disabled={declineInvoiceMutation.isPending}
                    className="rounded-full border border-red-500/50 px-3 py-1.5 text-red-400 hover:bg-red-500/10 text-sm"
                  >
                    Decline
                  </button>
                </>
              )}
              {isAdmin && (inv.status === "APPROVED" || inv.status === "DECLINED" || inv.status === "PAID") && (
                <button
                  onClick={() =>
                    clearInvoiceMutation.mutate(inv.id, {
                      onSuccess: () => toast.success("Invoice cleared"),
                      onError: () => toast.error("Failed to clear"),
                    })
                  }
                  disabled={clearInvoiceMutation.isPending}
                  className="rounded-full border border-white/20 px-3 py-1.5 text-white/80 hover:text-white text-sm"
                >
                  Clear
                </button>
              )}
              {inv.issuerId === user?.id && (inv.status === "DRAFT" || inv.status === "SENT") && (
                <>
                  <button
                    type="button"
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
                    className="rounded-full border border-white/20 px-3 py-1.5 text-white/80 hover:text-white text-sm"
                  >
                    Edit
                  </button>
                  {inv.status === "DRAFT" && (
                    <button
                      onClick={() =>
                        deleteInvoiceMutation.mutate(inv.id, {
                          onSuccess: () => toast.success("Invoice deleted"),
                          onError: () => toast.error("Failed to delete"),
                        })
                      }
                      disabled={deleteInvoiceMutation.isPending}
                      className="rounded-full border border-red-500/50 px-3 py-1.5 text-red-400 hover:bg-red-500/10 text-sm"
                    >
                      Delete
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-12 text-white/60">
          No invoices yet.
          {!isAdmin && (
            <>
              {" "}
              <button onClick={openAddInvoice} className="text-white hover:underline">
                Raise an invoice
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
