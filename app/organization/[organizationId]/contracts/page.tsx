"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, CheckCircle2, Clock, Download, Eye } from "lucide-react";
import {
  useGetContractsByOrganization,
  useDeleteContract,
  useSignContract,
} from "@/features/business/hooks/use-contracts";
import { useOrganizationOrg } from "@/contexts/organization-org-context";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";
import { downloadContract } from "@/utils/contract-download";
import { EditContractModal } from "@/components/edit-contract-modal";
import { ContractDetailModal } from "@/components/contract-detail-modal";
import { Contract } from "@/features/business/api/client";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/stores/authStore";

export default function OrganizationContractsPage() {
  const params = useParams();
  const organizationId = params?.organizationId as string;
  const { isAdmin, openCreateContract } = useOrganizationOrg();
  const { user } = useAuthStore();
  const { data: contracts = [], isLoading: isContractsLoading } = useGetContractsByOrganization(organizationId);
  const deleteContractMutation = useDeleteContract();
  const signContractMutation = useSignContract();
  const [contractToEdit, setContractToEdit] = useState<Contract | null>(null);
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);
  const [contractToView, setContractToView] = useState<Contract | null>(null);
  const [signingId, setSigningId] = useState<string | null>(null);

  const formatCurrencyLocal = (amount: number, currency: string) => formatCurrency(amount, currency);

  const handleSign = (contractId: string) => {
    setSigningId(contractId);
    signContractMutation.mutate(contractId, {
      onSuccess: () => {
        toast.success("Contract signed successfully");
        setSigningId(null);
      },
      onError: (err: { message?: string }) => {
        toast.error(err?.message ?? "Failed to sign contract");
        setSigningId(null);
      },
    });
  };

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

  const formatDate = (d: Date | null | undefined) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
        contracts.map((c) => {
          const isSigned = !!c.signedAt;
          const isAssignee = c.assignedToUserId === user?.id;

          return (
            <div
              key={c.id}
              className={`flex flex-col sm:flex-row sm:items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] ${isAdmin || isAssignee ? " cursor-pointer hover:bg-white/[0.04] transition-colors" : ""}`}
              onClick={isAdmin || isAssignee ? () => setContractToView(c) : undefined}
            >
              {/* Left: info */}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-medium">{c.title || "Contract"}</p>
                  {c.jobTitle && <span className="text-xs text-white/40">· {c.jobTitle}</span>}
                  {/* Signed status badge */}
                  {isSigned ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2 py-0.5">
                      <CheckCircle2 className="h-3 w-3" />
                      Signed {formatDate(c.signedAt)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-white/40 bg-white/5 border border-white/10 rounded-full px-2 py-0.5">
                      <Clock className="h-3 w-3" />
                      Awaiting signature
                    </span>
                  )}
                </div>
                <p className="text-white/60 text-sm">
                  {isAdmin
                    ? `Assigned to ${c.assignedTo?.name ?? c.assignedToEmail}`
                    : `From ${c.organization?.name ?? "organization"}`}
                  {c.compensationAmount != null &&
                    ` · ${formatCurrencyLocal(c.compensationAmount, c.compensationCurrency ?? "USD")}${c.paymentFrequency ? " / " + c.paymentFrequency.toLowerCase() : ""}`}
                </p>
                {c.startDate && (
                  <p className="text-white/40 text-xs">
                    {formatDate(c.startDate)}{c.endDate ? ` → ${formatDate(c.endDate)}` : " · No end date"}
                  </p>
                )}
              </div>

              {/* Right: actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Download: available to everyone who can see the contract */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); downloadContract(c); }}
                  className="rounded-full border border-white/20 p-2 text-white/80 hover:text-white hover:bg-white/5"
                  title="Download contract"
                >
                  <Download className="h-4 w-4" />
                </button>
                {/* Member: sign button */}
                {!isAdmin && isAssignee && !isSigned && (
                  <button
                    type="button"
                    disabled={signingId === c.id}
                    onClick={(e) => { e.stopPropagation(); handleSign(c.id); }}
                    className="rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 px-4 py-1.5 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    {signingId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Mark as signed
                  </button>
                )}

                {/* Admin: view + edit + delete */}
                {isAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setContractToView(c); }}
                      className="rounded-full border border-white/20 p-2 text-white/80 hover:text-white hover:bg-white/5"
                      title="View contract"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setContractToEdit(c); }}
                      className="rounded-full border border-white/20 p-2 text-white/80 hover:text-white hover:bg-white/5"
                      title="Edit contract"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setContractToDelete(c); }}
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
          );
        })
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

      <ContractDetailModal
        isOpen={!!contractToView}
        onClose={() => setContractToView(null)}
        contract={contractToView}
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
                  {deleteContractMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
