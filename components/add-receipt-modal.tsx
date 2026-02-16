import React, { useState, useRef, useEffect } from "react";
import { X, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreateReceipt, useUpdateReceipt, type Receipt } from "@/features/groups/hooks/use-receipts";
import { useUploadFile } from "@/features/files/hooks/use-balances";
import CurrencyDropdown from "@/components/currency-dropdown";
import { toast } from "sonner";

interface AddReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  /** When provided, modal works in edit mode for this receipt */
  receipt?: Receipt | null;
}

export const AddReceiptModal: React.FC<AddReceiptModalProps> = ({
  isOpen,
  onClose,
  groupId,
  receipt,
}) => {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [imageUrl, setImageUrl] = useState("");
  const [fileKey, setFileKey] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createReceiptMutation = useCreateReceipt();
  const updateReceiptMutation = useUpdateReceipt();
  const uploadFileMutation = useUploadFile();

  const isEditMode = !!receipt;

  useEffect(() => {
    if (isOpen && receipt) {
      setDescription(receipt.description);
      setAmount(receipt.amount.toString());
      setCurrency(receipt.currency);
      setImageUrl(receipt.imageUrl || "");
      setFileKey(receipt.fileKey || "");
    } else if (isOpen && !receipt) {
      setDescription("");
      setAmount("");
      setCurrency("USD");
      setImageUrl("");
      setFileKey("");
    }
  }, [isOpen, receipt]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;

    if (isEditMode && receipt) {
      updateReceiptMutation.mutate(
        {
          receiptId: receipt.id,
          groupId,
          payload: {
            description,
            amount: parseFloat(amount),
            currency,
            imageUrl: imageUrl || undefined,
            fileKey: fileKey || undefined,
          },
        },
        {
          onSuccess: () => {
            onClose();
          },
        }
      );
    } else {
      createReceiptMutation.mutate(
        {
          groupId,
          payload: {
            description,
            amount: parseFloat(amount),
            currency,
            imageUrl,
            fileKey,
          },
        },
        {
          onSuccess: () => {
            onClose();
            setDescription("");
            setAmount("");
            setImageUrl("");
            setFileKey("");
          },
        }
      );
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await uploadFileMutation.mutateAsync(file);
      setImageUrl(result.data.downloadUrl);
      setFileKey(result.data.filePath);
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
      <div className="relative w-full max-w-[450px] overflow-hidden rounded-[32px] border border-white/20 bg-black p-6 sm:p-8">
        <button
          onClick={onClose}
          className="absolute right-6 top-6 rounded-full bg-white/5 p-2 transition-colors hover:bg-white/10"
        >
          <X className="h-5 w-5 text-white" />
        </button>

        <h2 className="mb-6 text-2xl font-medium text-white">{isEditMode ? "Edit Receipt" : "Add Receipt"}</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-2 block text-white/70">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-white/30"
              placeholder="e.g. Office Lunch"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-white/70">Amount</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-white/30"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-white/70">Currency</label>
               <CurrencyDropdown
                selectedCurrencies={[currency]}
                setSelectedCurrencies={(c) => setCurrency(c[0])}
                showFiatCurrencies={true}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-white/70">Receipt Image</label>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange}
            />
            <div 
              onClick={handleUploadClick}
              className="group relative flex aspect-video w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-white/10 bg-white/5 transition-colors hover:border-white/30"
            >
              {imageUrl ? (
                <img src={imageUrl} alt="Receipt preview" className="h-full w-full object-cover" />
              ) : (
                <>
                  {isUploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-white/50" />
                  ) : (
                    <>
                      <Upload className="mb-2 h-8 w-8 text-white/30 transition-colors group-hover:text-white/50" />
                      <span className="text-white/30 transition-colors group-hover:text-white/50">Upload Receipt</span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="h-14 w-full rounded-2xl bg-white text-lg font-semibold text-black transition-all hover:bg-white/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={createReceiptMutation.isPending || updateReceiptMutation.isPending || isUploading}
          >
            {isEditMode
              ? (updateReceiptMutation.isPending ? "Updating..." : "Update Receipt")
              : (createReceiptMutation.isPending ? "Submitting..." : "Submit Receipt")}
          </button>
        </form>
      </div>
    </div>
  );
};
