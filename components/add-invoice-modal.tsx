"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useCreateInvoice } from "@/features/business/hooks/use-invoices";
import { useUploadFile } from "@/features/files/hooks/use-balances";
import { useGetMyContracts } from "@/features/business/hooks/use-contracts";
import type { Contract } from "@/features/business/api/client";
import { Loader2, Camera, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { fadeIn } from "@/utils/animations";
import CurrencyDropdown from "@/components/currency-dropdown";
import type { Currency } from "@/features/currencies/api/client";

interface AddInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  /** When opening from a contract view page, pass the contract to link and prefill amount/currency */
  initialContract?: Contract | null;
}

export function AddInvoiceModal({ isOpen, onClose, organizationId, initialContract }: AddInvoiceModalProps) {
  const createInvoiceMutation = useCreateInvoice();
  const uploadFileMutation = useUploadFile();
  const { data: myContracts = [] } = useGetMyContracts();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contractsForOrg = myContracts.filter((c) => c.organizationId === organizationId);
  const [formData, setFormData] = useState({
    amount: "",
    currency: "USD",
    dueDate: "",
    description: "",
    imageUrl: "" as string,
    contractId: "" as string,
  });

  useEffect(() => {
    if (!isOpen) return;
    if (initialContract) {
      setFormData((p) => ({
        ...p,
        contractId: initialContract.id,
        amount: initialContract.compensationAmount != null ? String(initialContract.compensationAmount) : p.amount,
        currency: initialContract.compensationCurrency ?? p.currency,
      }));
    } else {
      setFormData((p) => ({ ...p, contractId: "" }));
    }
  }, [isOpen, initialContract]);

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
    const amount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!formData.dueDate) {
      toast.error("Please select a due date");
      return;
    }
    createInvoiceMutation.mutate(
      {
        organizationId,
        amount,
        currency: formData.currency,
        dueDate: formData.dueDate,
        description: formData.description || undefined,
        imageUrl: formData.imageUrl || undefined,
        contractId: formData.contractId || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Invoice created");
          setFormData({ amount: "", currency: "USD", dueDate: "", description: "", imageUrl: "", contractId: "" });
          onClose();
        },
        onError: (err: { message?: string }) => {
          toast.error(err?.message || "Failed to create invoice");
        },
      }
    );
  };

  const onContractSelect = (contract: Contract | null) => {
    if (!contract) {
      setFormData((p) => ({ ...p, contractId: "", amount: p.amount, currency: p.currency }));
      return;
    }
    setFormData((p) => ({
      ...p,
      contractId: contract.id,
      amount: contract.compensationAmount != null ? String(contract.compensationAmount) : p.amount,
      currency: contract.compensationCurrency ?? p.currency,
    }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" {...fadeIn}>
        <div className="fixed inset-0 bg-black/70 brightness-50" onClick={onClose} />
        <div className="relative z-10 bg-black rounded-3xl w-full max-w-lg border border-white/70 p-8" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-xl font-semibold text-white mb-6">Raise Invoice</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {contractsForOrg.length > 0 && (
              <div>
                <label className="block text-base text-white mb-2">Link to contract</label>
                <select
                  value={formData.contractId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const c = id ? contractsForOrg.find((x) => x.id === id) ?? null : null;
                    onContractSelect(c);
                  }}
                  className="w-full h-12 bg-transparent rounded-lg px-4 text-base text-white border border-white/10"
                >
                  <option value="">None</option>
                  {contractsForOrg.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title || "Contract"} {c.compensationAmount != null ? `(${c.compensationCurrency} ${c.compensationAmount})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
                <CurrencyDropdown
                  selectedCurrencies={formData.currency ? [formData.currency] : []}
                  setSelectedCurrencies={(currencies) =>
                    setFormData((p) => ({ ...p, currency: currencies[0] || "USD" }))
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
                <label className="block text-base text-white mb-2">Description</label>
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
              <label className="block text-base text-white mb-2">Invoice image</label>
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
                disabled={createInvoiceMutation.isPending}
                className="flex-1 h-12 bg-white text-black rounded-full font-medium hover:bg-white/90 disabled:opacity-70"
              >
                {createInvoiceMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Create Invoice"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
