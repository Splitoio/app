"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { useGetContractByToken, useClaimContractByToken, useSignContract, useRejectContract } from "@/features/business/hooks/use-contracts";
import { getFileDownloadUrl } from "@/features/files/api/client";
import { Loader2, FileText, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { viewPdf } from "@/utils/file";
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

export default function ContractViewPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { user } = useAuthStore();
  const router = useRouter();
  const { data, isLoading, isError, error } = useGetContractByToken(token);
  const claimMutation = useClaimContractByToken();
  const signMutation = useSignContract();
  const rejectMutation = useRejectContract();
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [rejected, setRejected] = useState(false);

  useEffect(() => {
    if (!data || !user || data.contract.assignedToUserId != null) return;
    claimMutation.mutate(data.token, { onError: () => {} });
  }, [data?.token, user?.id, data?.contract?.assignedToUserId]);

  if (!token) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center text-white">
          <p className="text-white/80 mb-4">Invalid link. No contract token provided.</p>
          <Link href="/login" className="text-white underline">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Loader2 className="h-10 w-10 animate-spin text-white/50" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center text-white max-w-sm">
          <p className="text-white/80 mb-4">This link is invalid or has expired.</p>
          <Link href="/login" className="text-white underline block mb-2">
            Log in
          </Link>
          <Link href="/signup" className="text-white underline">
            Sign up
          </Link>
        </div>
      </div>
    );
  }

  const contract = data.contract;
  const callbackUrl = `/contract/view?token=${encodeURIComponent(token)}`;
  const isAssignee = contract.assignedToUserId === user?.id;
  const isSigned = !!contract.signedAt;
  const isRejected = contract.status === "REJECTED" || rejected;
  const pendingAcceptReject = isAssignee && !isSigned && !isRejected;

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center text-white max-w-md">
          <h1 className="text-xl font-semibold mb-2">{contract.title || "Contract"}</h1>
          <p className="text-white/70 mb-4">{contract.organization?.name}</p>
          <p className="text-white/80 mb-6">Sign up or log in to view your contract and raise invoices based on it.</p>
          <Link
            href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="inline-block rounded-full bg-white text-black px-6 py-3 font-medium hover:bg-white/90 mb-3"
          >
            Sign up
          </Link>
          <br />
          <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-white underline">
            Already have an account? Log in
          </Link>
        </div>
      </div>
    );
  }

  const handleViewPdf = async () => {
    if (!contract.pdfFileKey || isPdfLoading) return;
    try {
      setIsPdfLoading(true);
      const r = await getFileDownloadUrl(contract.pdfFileKey);
      await viewPdf(r.downloadUrl);
    } catch {
      // ignore
    } finally {
      setIsPdfLoading(false);
    }
  };


  const handleRaiseInvoice = () => {
    router.push(
      `/organization/${contract.organizationId}/invoices?openInvoice=1&contractId=${contract.id}`
    );
  };

  const handleSign = (payload: { signatureDataUrl: string; signerName: string }) => {
    signMutation.mutate(
      { contractId: contract.id, ...payload },
      {
        onSuccess: () => {
          toast.success("Contract signed. You’ll receive a copy by email. You now have access to the organization.");
          router.push(`/organization/${contract.organizationId}/invoices`);
        },
        onError: (e: unknown) => toast.error(errorMessage(e) || "Failed to sign contract"),
      }
    );
  };

  const handleReject = () => {
    rejectMutation.mutate(contract.id, {
      onSuccess: () => {
        setRejected(true);
        toast.success("Contract rejected.");
      },
      onError: (e: unknown) => toast.error(errorMessage(e) || "Failed to reject contract"),
    });
  };

  // Rejected: show message and block access to org
  if (isRejected) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <XCircle className="h-16 w-16 text-red-400/80 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">You have rejected this contract</h1>
          <p className="text-white/70 mb-6">
            You do not have access to {contract.organization?.name}. Only members who accept their contract can view the organization.
          </p>
          <Link
            href="/organization"
            className="inline-block rounded-full bg-white/10 text-white px-6 py-3 font-medium hover:bg-white/20 border border-white/20"
          >
            Back to organizations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-semibold mb-1">{contract.title || "Contract"}</h1>
        <p className="text-white/60 text-sm mb-6">{contract.organization?.name}</p>
        {contract.description && (
          <p className="text-white/80 mb-4 whitespace-pre-wrap">{contract.description}</p>
        )}
        {contract.compensationAmount != null && (
          <p className="text-white/80 mb-4">
            Compensation: {contract.compensationCurrency ?? "USD"} {contract.compensationAmount}
          </p>
        )}
        <button
          type="button"
          onClick={handleViewPdf}
          disabled={isPdfLoading}
          className="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-white/90 hover:text-white hover:border-white/40 mb-6 disabled:opacity-50"
        >
          {isPdfLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Opening...
            </>
          ) : (
            <>
              <FileText className="h-5 w-5" />
              View PDF
            </>
          )}
        </button>

        {pendingAcceptReject && (
          <>
            <ContractSignatureCapture
              onSign={handleSign}
              isPending={signMutation.isPending}
              disabled={rejectMutation.isPending}
            />
            <button
              type="button"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
              className="flex items-center justify-center gap-2 rounded-full border border-red-400/50 text-red-400 px-6 py-3 font-medium hover:bg-red-400/10 disabled:opacity-50 w-full sm:w-auto"
            >
              {rejectMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
              Reject contract
            </button>
          </>
        )}

        {isAssignee && isSigned && (
          <button
            type="button"
            onClick={handleRaiseInvoice}
            className="w-full sm:w-auto rounded-full bg-white text-black px-6 py-3 font-medium hover:bg-white/90"
          >
            Raise invoice from this contract
          </button>
        )}
      </div>
    </div>
  );
}
