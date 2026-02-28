"use client";

import Image from "next/image";
import { X, CheckCircle, XCircle, Loader2 } from "lucide-react";
import type { Invoice } from "@/features/business/api/client";
import { formatCurrency } from "@/utils/formatters";

interface InvoiceReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onApprove: () => void;
  onDecline: () => void;
  isApproving?: boolean;
  isDeclining?: boolean;
}

export function InvoiceReviewModal({
  isOpen,
  onClose,
  invoice,
  onApprove,
  onDecline,
  isApproving = false,
  isDeclining = false,
}: InvoiceReviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        className="relative z-10 bg-[#101012] rounded-2xl border border-white/20 w-full max-w-md max-h-[90vh] overflow-hidden shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          <h2 className="text-lg font-semibold text-white">View invoice</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {invoice ? (
            <>
              {invoice.imageUrl && (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-white/5">
                  <Image
                    src={invoice.imageUrl}
                    alt="Invoice"
                    fill
                    className="object-contain"
                    sizes="(max-width: 448px) 100vw, 448px"
                  />
                </div>
              )}
              <div>
                <p className="text-white font-medium">
                  {formatCurrency(invoice.amount, invoice.currency)}
                </p>
                <p className="text-white/60 text-sm mt-0.5">
                  From {invoice.issuer?.name || invoice.issuer?.email || "Member"}
                </p>
              </div>
              <p className="text-white/70 text-sm">
                Due {new Date(invoice.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
              {invoice.description && (
                <p className="text-white/70 text-sm whitespace-pre-wrap">{invoice.description}</p>
              )}
              <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={onApprove}
                  disabled={isApproving || isDeclining}
                  className="flex items-center justify-center gap-2 rounded-full bg-white text-black px-5 py-2.5 font-medium hover:bg-white/90 disabled:opacity-50"
                >
                  {isApproving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Approve
                </button>
                <button
                  type="button"
                  onClick={onDecline}
                  disabled={isApproving || isDeclining}
                  className="flex items-center justify-center gap-2 rounded-full border border-red-400/50 text-red-400 px-5 py-2.5 font-medium hover:bg-red-400/10 disabled:opacity-50"
                >
                  {isDeclining ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  Decline
                </button>
              </div>
            </>
          ) : (
            <p className="text-white/60 text-sm py-4">Invoice not found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
