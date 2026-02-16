"use client";

import { useState, useRef } from "react";
import { useCreateContract } from "@/features/business/hooks/use-contracts";
import { useUploadFile } from "@/features/files/hooks/use-balances";
import { Loader2, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { fadeIn } from "@/utils/animations";
import CurrencyDropdown from "@/components/currency-dropdown";
import type { Currency } from "@/features/currencies/api/client";

interface CreateContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  onSuccess?: () => void;
}

export function CreateContractModal({ isOpen, onClose, organizationId, onSuccess }: CreateContractModalProps) {
  const createContractMutation = useCreateContract();
  const uploadFileMutation = useUploadFile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    assignedToEmail: "",
    title: "",
    description: "",
    compensationAmount: "",
    compensationCurrency: "USD",
    pdfFileKey: "" as string,
  });

  const handlePdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }
    try {
      const res = await uploadFileMutation.mutateAsync(file);
      const filePath = (res as { data?: { filePath?: string } })?.data?.filePath;
      if (filePath) setFormData((p) => ({ ...p, pdfFileKey: filePath }));
    } catch {
      toast.error("Failed to upload PDF");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const email = formData.assignedToEmail.trim();
    if (!email) {
      toast.error("Assignee email is required");
      return;
    }
    const amount = formData.compensationAmount ? parseFloat(formData.compensationAmount) : undefined;
    if (formData.compensationAmount && (isNaN(amount!) || amount! < 0)) {
      toast.error("Please enter a valid compensation amount");
      return;
    }
    createContractMutation.mutate(
      {
        organizationId,
        assignedToEmail: email,
        title: formData.title.trim() || undefined,
        description: formData.description.trim() || undefined,
        compensationAmount: amount,
        compensationCurrency: formData.compensationCurrency || undefined,
        pdfFileKey: formData.pdfFileKey || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Contract created and email sent to assignee");
          setFormData({
            assignedToEmail: "",
            title: "",
            description: "",
            compensationAmount: "",
            compensationCurrency: "USD",
            pdfFileKey: "",
          });
          onClose();
          onSuccess?.();
        },
        onError: (err: { message?: string }) => {
          toast.error(err?.message || "Failed to create contract");
        },
      }
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" {...fadeIn}>
        <div className="fixed inset-0 bg-black/70 brightness-50" onClick={onClose} />
        <div
          className="relative z-10 bg-black rounded-3xl w-full max-w-lg border border-white/70 p-8 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-semibold text-white mb-6">Create Contract</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-base text-white mb-2">Assign to (email) *</label>
              <input
                type="email"
                value={formData.assignedToEmail}
                onChange={(e) => setFormData((p) => ({ ...p, assignedToEmail: e.target.value }))}
                className="w-full h-12 bg-transparent rounded-lg px-4 text-base text-white border border-white/10"
                placeholder="assignee@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-base text-white mb-2">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                className="w-full h-12 bg-transparent rounded-lg px-4 text-base text-white border border-white/10"
                placeholder="Contract title"
              />
            </div>
            <div>
              <label className="block text-base text-white mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                className="w-full min-h-[80px] bg-transparent rounded-lg px-4 py-3 text-base text-white border border-white/10 resize-y"
                placeholder="Contract description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-base text-white mb-2">Compensation amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.compensationAmount}
                  onChange={(e) => setFormData((p) => ({ ...p, compensationAmount: e.target.value }))}
                  className="w-full h-12 bg-transparent rounded-lg px-4 text-base text-white border border-white/10"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-base text-white mb-2">Currency</label>
                <CurrencyDropdown
                  selectedCurrencies={formData.compensationCurrency ? [formData.compensationCurrency] : []}
                  setSelectedCurrencies={(currencies) =>
                    setFormData((p) => ({ ...p, compensationCurrency: currencies[0] || "USD" }))
                  }
                  mode="single"
                  showFiatCurrencies={true}
                  disableChainCurrencies={true}
                  filterCurrencies={(currency: Currency) =>
                    currency.symbol !== "ETH" && currency.symbol !== "USDC"
                  }
                  placeholder="Select currency..."
                />
              </div>
            </div>
            <div>
              <label className="block text-base text-white mb-2">PDF document</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handlePdfChange}
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-24 w-24 rounded-xl border border-white/20 border-dashed flex flex-col items-center justify-center text-white/60 hover:text-white hover:border-white/40 transition-colors gap-1"
                >
                  {formData.pdfFileKey ? (
                    <>
                      <FileText className="h-8 w-8 text-green-400" />
                      <span className="text-xs">PDF attached</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-8 w-8" />
                      <span className="text-xs">Upload PDF</span>
                    </>
                  )}
                </button>
                {formData.pdfFileKey && (
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, pdfFileKey: "" }))}
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
                disabled={createContractMutation.isPending}
                className="flex-1 h-12 bg-white text-black rounded-full font-medium hover:bg-white/90 disabled:opacity-70"
              >
                {createContractMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Create & Send"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
