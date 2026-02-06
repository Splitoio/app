"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useUpdateInvoice } from "@/features/business/hooks/use-invoices";
import { useUploadFile } from "@/features/files/hooks/use-balances";
import { Loader2, Camera, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { fadeIn } from "@/utils/animations";

export type InvoiceForEdit = {
  id: string;
  amount: number;
  currency: string;
  dueDate: string | Date;
  description: string | null;
  imageUrl: string | null;
};

interface EditInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceForEdit | null;
  onSuccess?: () => void;
}

function formatDueDateForInput(dueDate: string | Date): string {
  const d = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  return d.toISOString().slice(0, 10);
}

export function EditInvoiceModal({ isOpen, onClose, invoice, onSuccess }: EditInvoiceModalProps) {
  const updateInvoiceMutation = useUpdateInvoice();
  const uploadFileMutation = useUploadFile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    amount: "",
    currency: "USD",
    dueDate: "",
    description: "",
    imageUrl: "" as string,
  });

  useEffect(() => {
    if (invoice && isOpen) {
      setFormData({
        amount: String(invoice.amount),
        currency: invoice.currency,
        dueDate: formatDueDateForInput(invoice.dueDate),
        description: invoice.description ?? "",
        imageUrl: invoice.imageUrl ?? "",
      });
    }
  }, [invoice, isOpen]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadFileMutation.mutateAsync(file);
      const url = res.data?.downloadUrl ?? (res as { data?: { downloadUrl?: string } })?.data?.downloadUrl;
      if (url) setFormData((p) => ({ ...p, imageUrl: url }));
    } catch {
      toast.error("Failed to upload image");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    const amount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!formData.dueDate) {
      toast.error("Please select a due date");
      return;
    }
    updateInvoiceMutation.mutate(
      {
        invoiceId: invoice.id,
        payload: {
          amount,
          currency: formData.currency,
          dueDate: formData.dueDate,
          description: formData.description || undefined,
          imageUrl: formData.imageUrl || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("Invoice updated");
          onSuccess?.();
          onClose();
        },
        onError: (err: { message?: string }) => {
          toast.error(err?.message || "Failed to update invoice");
        },
      }
    );
  };

  if (!isOpen) return null;
  if (!invoice) return null;

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" {...fadeIn}>
        <div className="fixed inset-0 bg-black/70 brightness-50" onClick={onClose} />
        <div className="relative z-10 bg-black rounded-3xl w-full max-w-lg border border-white/70 p-8" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-xl font-semibold text-white mb-6">Edit Invoice</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-base text-white mb-2">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))}
                  className="w-full h-12 bg-transparent rounded-lg px-4 text-base text-white border border-white/10"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-base text-white mb-2">Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData((p) => ({ ...p, currency: e.target.value }))}
                  className="w-full h-12 bg-transparent rounded-lg px-4 text-base text-white border border-white/10"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="INR">INR</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-base text-white mb-2">Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData((p) => ({ ...p, dueDate: e.target.value }))}
                  className="w-full h-12 bg-transparent rounded-lg px-4 text-base text-white border border-white/10"
                  required
                />
              </div>
              <div>
                <label className="block text-base text-white mb-2">Description (optional)</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  className="w-full h-12 bg-transparent rounded-lg px-4 text-base text-white border border-white/10"
                  placeholder="Invoice description"
                />
              </div>
            </div>
            <div>
              <label className="block text-base text-white mb-2">Invoice image (optional)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-24 w-24 rounded-xl border border-white/20 border-dashed flex items-center justify-center text-white/60 hover:text-white hover:border-white/40 transition-colors overflow-hidden"
                >
                  {formData.imageUrl ? (
                    <span className="relative block w-full h-full min-h-[96px] min-w-[96px]">
                      <Image src={formData.imageUrl} alt="Invoice" fill className="object-cover" sizes="96px" />
                    </span>
                  ) : (
                    <Camera className="h-8 w-8" />
                  )}
                </button>
                {formData.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, imageUrl: "" }))}
                    className="p-2 rounded-full border border-white/20 text-white/70 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="flex-1 h-12 rounded-full border border-white/20 text-white hover:bg-white/5">
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateInvoiceMutation.isPending}
                className="flex-1 h-12 bg-white text-black rounded-full font-medium hover:bg-white/90 disabled:opacity-70"
              >
                {updateInvoiceMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
