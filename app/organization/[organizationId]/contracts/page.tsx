"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import {
  useGetContractsByOrganization,
  useDeleteContract,
} from "@/features/business/hooks/use-contracts";
import { useOrganizationOrg } from "@/contexts/organization-org-context";
import { getFileDownloadUrl } from "@/features/files/api/client";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";
import { EditContractModal } from "@/components/edit-contract-modal";
import { Contract } from "@/features/business/api/client";
import { motion, AnimatePresence } from "framer-motion";
import { viewPdf } from "@/utils/file";


export default function OrganizationContractsPage() {
  const params = useParams();
  const organizationId = params?.organizationId as string;
  const { isAdmin, openCreateContract } = useOrganizationOrg();
  const { data: contracts = [], isLoading: isContractsLoading } = useGetContractsByOrganization(organizationId);
  const deleteContractMutation = useDeleteContract();
  const [contractToEdit, setContractToEdit] = useState<Contract | null>(null);
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);
  const [loadingContractId, setLoadingContractId] = useState<string | null>(null);


  const formatCurrencyLocal = (amount: number, currency: string) => formatCurrency(amount, currency);

  const handleConfirmDelete = () => {
    if (!contractToDelete) return;
    deleteContractMutation.mutate(contractToDelete.id, {
      onSuccess: () => {
        toast.success("Contract deleted");
        setContractToDelete(null);
      },
      onError: (err: { message?: string }) => {
        toast.error(err?.message ?? "Failed to delete contract");
      },
    });
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {isAdmin && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-mobile-lg sm:text-xl font-medium text-white">Contracts</h3>
          <button
            onClick={openCreateContract}
            className="flex items-center gap-2 rounded-full bg-white text-black h-10 px-4 text-sm font-medium hover:bg-white/90"
          >
            <Plus className="h-4 w-4" />
            Create contract
          </button>
        </div>
      )}
      {!isAdmin && <h3 className="text-mobile-lg sm:text-xl font-medium text-white mb-3 sm:mb-4">My contracts</h3>}
      {isContractsLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-white/50" />
        </div>
      ) : contracts.length > 0 ? (
        contracts.map((c) => (
          <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl bg-white/[0.02]">
            <div className="min-w-0">
              <p className="text-white font-medium">{c.title || "Contract"}</p>
              <p className="text-white/60 text-sm">
                Assigned to {c.assignedTo?.email ?? c.assignedToEmail}
                {c.compensationAmount != null && ` · ${formatCurrencyLocal(c.compensationAmount, c.compensationCurrency ?? "USD")}`}
              </p>
              {c.description && <p className="text-white/50 text-sm mt-1">{c.description}</p>}
            </div>
            <div className="flex items-center gap-2 self-start sm:self-center">
              {c.pdfFileKey && (
                <button
                  type="button"
                  disabled={loadingContractId === c.id}
                  onClick={async () => {
                    try {
                      setLoadingContractId(c.id);
                      const r = await getFileDownloadUrl(c.pdfFileKey!);
                      await viewPdf(r.downloadUrl);
                    } catch {
                      toast.error("Could not load PDF");
                    } finally {
                      setLoadingContractId(null);
                    }
                  }}
                  className="rounded-full border border-white/20 px-3 py-1.5 text-white/80 hover:text-white text-sm flex items-center gap-2 min-w-[85px] justify-center"
                >
                  {loadingContractId === c.id ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Opening...
                    </>
                  ) : (
                    "View PDF"
                  )}
                </button>

              )}
              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => setContractToEdit(c)}
                    className="rounded-full border border-white/20 p-2 text-white/80 hover:text-white hover:bg-white/5"
                    title="Edit contract"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setContractToDelete(c)}
                    disabled={deleteContractMutation.isPending}
                    className="rounded-full border border-white/20 p-2 text-red-400/80 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                    title="Delete contract"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-12 text-white/60">
          {isAdmin ? "No contracts yet. Create one to assign to someone by email." : "No contracts assigned to you."}
        </div>
      )}

      <EditContractModal
        isOpen={!!contractToEdit}
        onClose={() => setContractToEdit(null)}
        contract={contractToEdit}
        onSuccess={() => setContractToEdit(null)}
      />

      <AnimatePresence>
        {contractToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-black/70"
              onClick={() => !deleteContractMutation.isPending && setContractToDelete(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 bg-[#101012] rounded-2xl border border-white/20 p-6 w-full max-w-sm shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-white mb-2">Delete contract?</h3>
              <p className="text-white/70 text-sm mb-6">
                This cannot be undone. The contract will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setContractToDelete(null)}
                  disabled={deleteContractMutation.isPending}
                  className="flex-1 h-11 rounded-full border border-white/20 text-white hover:bg-white/5 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleteContractMutation.isPending}
                  className="flex-1 h-11 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleteContractMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
