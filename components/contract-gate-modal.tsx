"use client";

import { useState, useEffect } from "react";
import { X, XCircle, Loader2, FileText, ArrowLeft, Download } from "lucide-react";
import type { Contract } from "@/features/business/api/client";
import { useSignContract, useRejectContract } from "@/features/business/hooks/use-contracts";
import { QueryKeys } from "@/lib/constants";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getFileDownloadUrl } from "@/features/files/api/client";
import { viewPdf } from "@/utils/file";
import { downloadContract } from "@/utils/contract-download";
import { ContractSignatureCapture } from "@/components/contract-signature-capture";

function errorMessage(e: unknown): string {
  if (e == null) return "Something went wrong";
  if (typeof e === "string") return e;
  if (typeof (e as { message?: string }).message === "string") return (e as { message: string }).message;
  const d = (e as { response?: { data?: { message?: string; error?: string } } })?.response?.data;
  if (d?.message) return d.message;
  if (d?.error) return d.error;
  return "Something went wrong";
}

interface ContractGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  isLoading?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
}

export function ContractGateModal({
  isOpen,
  onClose,
  contract,
  isLoading,
  onAccept,
  onReject,
}: ContractGateModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const signMutation = useSignContract();
  const rejectMutation = useRejectContract();
  const [step, setStep] = useState<"summary" | "view">("summary");
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (isOpen) setStep("summary");
  }, [isOpen]);

  const handleSign = (payload: { signatureDataUrl: string; signerName: string }) => {
    if (!contract) return;
    signMutation.mutate(
      { contractId: contract.id, ...payload },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: [QueryKeys.BUSINESS_ORGANIZATIONS] });
          queryClient.invalidateQueries({ queryKey: [QueryKeys.CONTRACTS] });
          toast.success("Contract accepted. You now have access to the organization.");
          onAccept?.();
          onClose();
          router.push(`/organization/${contract.organizationId}/invoices`);
        },
        onError: (e: unknown) => toast.error(errorMessage(e)),
      }
    );
  };

  const handleReject = () => {
    if (!contract) return;
    rejectMutation.mutate(contract.id, {
      onSuccess: () => {
        toast.success("Contract rejected.");
        onReject?.();
        onClose();
      },
      onError: (e: unknown) => toast.error(errorMessage(e)),
    });
  };

  const handleViewPdf = async () => {
    if (!contract?.pdfFileKey || pdfLoading) return;
    try {
      setPdfLoading(true);
      const r = await getFileDownloadUrl(contract.pdfFileKey);
      await viewPdf(r.downloadUrl);
    } catch {
      toast.error("Could not open PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        className="relative z-10 bg-[#101012] rounded-2xl border border-white/20 w-full max-w-md max-h-[90vh] overflow-hidden shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            {step === "view" && (
              <button
                type="button"
                onClick={() => setStep("summary")}
                className="h-8 w-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-white">
              {step === "summary" ? "Contract pending" : "View contract"}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            {contract && (
              <button
                type="button"
                onClick={() => downloadContract(contract)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10"
                title="Download contract"
              >
                <Download className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-white/50" />
            </div>
          ) : contract ? (
            step === "summary" ? (
              <>
                <div>
                  <p className="text-white font-medium">{contract.title || "Contract"}</p>
                  <p className="text-white/60 text-sm mt-0.5">
                    {contract.organization?.name ?? "Organization"}
                  </p>
                </div>
                <p className="text-white/60 text-sm">
                  You have been assigned a contract. View the full contract to accept or reject.
                </p>
                <button
                  type="button"
                  onClick={() => setStep("view")}
                  className="w-full flex items-center justify-center gap-2 rounded-full bg-white text-black px-5 py-3 font-medium hover:bg-white/90"
                >
                  <FileText className="h-4 w-4" />
                  View contract
                </button>
              </>
            ) : (
              <>
                <div>
                  <p className="text-white font-medium">{contract.title || "Contract"}</p>
                  <p className="text-white/60 text-sm mt-0.5">
                    {contract.organization?.name ?? "Organization"}
                  </p>
                </div>
                {contract.description && (
                  <p className="text-white/70 text-sm whitespace-pre-wrap">{contract.description}</p>
                )}
                {contract.jobTitle && (
                  <p className="text-white/70 text-sm">
                    <span className="text-white/50">Role:</span> {contract.jobTitle}
                  </p>
                )}
                {contract.compensationAmount != null && (
                  <p className="text-white/70 text-sm">
                    <span className="text-white/50">Compensation:</span>{" "}
                    {contract.compensationCurrency ?? "USD"} {contract.compensationAmount}
                    {contract.paymentFrequency && ` (${contract.paymentFrequency})`}
                  </p>
                )}
                {contract.scopeOfWork && (
                  <p className="text-white/70 text-sm">
                    <span className="text-white/50">Scope:</span> {contract.scopeOfWork}
                  </p>
                )}
                {contract.pdfFileKey && (
                  <button
                    type="button"
                    onClick={handleViewPdf}
                    disabled={pdfLoading}
                    className="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-white/90 hover:text-white hover:border-white/40 text-sm disabled:opacity-50"
                  >
                    {pdfLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    View PDF
                  </button>
                )}
                <div className="pt-2 border-t border-white/10 space-y-3">
                  <ContractSignatureCapture
                    onSign={handleSign}
                    isPending={signMutation.isPending}
                    disabled={rejectMutation.isPending}
                  />
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={rejectMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 rounded-full border border-red-400/50 text-red-400 px-5 py-2.5 font-medium hover:bg-red-400/10 disabled:opacity-50"
                  >
                    {rejectMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    Reject
                  </button>
                </div>
              </>
            )
          ) : (
            <p className="text-white/60 text-sm py-4">Contract not found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
