"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { useGetContractByToken, useClaimContractByToken } from "@/features/business/hooks/use-contracts";
import { getFileDownloadUrl } from "@/features/files/api/client";
import { Loader2, FileText } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ContractViewPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { user } = useAuthStore();
  const router = useRouter();
  const { data, isLoading, isError, error } = useGetContractByToken(token);
  const claimMutation = useClaimContractByToken();

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
    if (!contract.pdfFileKey) return;
    try {
      const r = await getFileDownloadUrl(contract.pdfFileKey);
      window.open(r.downloadUrl, "_blank");
    } catch {
      // ignore
    }
  };

  const handleRaiseInvoice = () => {
    router.push(
      `/organization/${contract.organizationId}/invoices?openInvoice=1&contractId=${contract.id}`
    );
  };

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
        {contract.pdfFileKey && (
          <button
            type="button"
            onClick={handleViewPdf}
            className="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-white/90 hover:text-white hover:border-white/40 mb-6"
          >
            <FileText className="h-5 w-5" />
            View PDF
          </button>
        )}
        {contract.assignedToUserId === user?.id && (
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
