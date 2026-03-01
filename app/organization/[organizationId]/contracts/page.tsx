"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, CheckCircle2, Clock, Download, Eye } from "lucide-react";
import {
  useGetContractsByOrganization,
  useRevokeContract,
} from "@/features/business/hooks/use-contracts";
import { useOrganizationOrg } from "@/contexts/organization-org-context";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";
import { downloadContract } from "@/utils/contract-download";
import { EditContractModal } from "@/components/edit-contract-modal";
import { ContractDetailModal } from "@/components/contract-detail-modal";
import { ContractGateModal } from "@/components/contract-gate-modal";
import { Contract } from "@/features/business/api/client";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/stores/authStore";

export default function OrganizationContractsPage() {
  const params = useParams();
  const organizationId = params?.organizationId as string;
  const { isAdmin, openCreateContract } = useOrganizationOrg();
  const { user } = useAuthStore();
  const { data: contracts = [], isLoading: isContractsLoading } = useGetContractsByOrganization(organizationId);
  const revokeContractMutation = useRevokeContract();
  const [contractToEdit, setContractToEdit] = useState<Contract | null>(null);
  const [contractToRevoke, setContractToRevoke] = useState<Contract | null>(null);
  const [contractToView, setContractToView] = useState<Contract | null>(null);
  const [contractToSign, setContractToSign] = useState<Contract | null>(null);

  const formatCurrencyLocal = (amount: number, currency: string) => formatCurrency(amount, currency);

  const handleRowClick = (c: Contract) => {
    const isAssignee = c.assignedToUserId === user?.id;
    const isSigned = !!c.signedAt;
    if (!isAdmin && isAssignee && !isSigned) {
      setContractToSign(c);
    } else {
      setContractToView(c);
    }
  };

  const handleConfirmRevoke = () => {
    if (!contractToRevoke) return;
    revokeContractMutation.mutate(contractToRevoke.id, {
      onSuccess: () => {
        toast.success("Contract revoked and member removed from organization");
        setContractToRevoke(null);
      },
      onError: (err: { message?: string }) => {
        toast.error(err?.message ?? "Failed to revoke contract");
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
          const isRevoked = c.status === "REVOKED";
          const isAssignee = c.assignedToUserId === user?.id;

          return (
            <div
              key={c.id}
              className={`flex flex-col sm:flex-row sm:items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] ${isAdmin || isAssignee ? " cursor-pointer hover:bg-white/[0.04] transition-colors" : ""}`}
              onClick={isAdmin || isAssignee ? () => handleRowClick(c) : undefined}
            >
              {/* Left: info */}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-medium">{c.title || "Contract"}</p>
                  {c.jobTitle && <span className="text-xs text-white/40">· {c.jobTitle}</span>}
                  {/* Status badge */}
                  {isRevoked ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5">
                      Revoked
                    </span>
                  ) : isSigned ? (
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
                {/* Member: view opens contract gate (View → Accept/Reject) */}
                {!isAdmin && isAssignee && !isSigned && !isRevoked && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setContractToSign(c); }}
                    className="rounded-full border border-white/20 px-4 py-1.5 text-sm font-medium text-white/90 hover:text-white hover:bg-white/5 flex items-center gap-2"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </button>
                )}

                {/* Admin: view + edit + revoke (edit/revoke hidden for revoked contracts) */}
                {isAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRowClick(c); }}
                      className="rounded-full border border-white/20 p-2 text-white/80 hover:text-white hover:bg-white/5"
                      title="View contract"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {!isRevoked && (
                      <>
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
                          onClick={(e) => { e.stopPropagation(); setContractToRevoke(c); }}
                          disabled={revokeContractMutation.isPending}
                          className="rounded-full border border-white/20 p-2 text-red-400/80 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                          title="Revoke contract"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
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

      <ContractGateModal
        isOpen={!!contractToSign}
        onClose={() => setContractToSign(null)}
        contract={contractToSign}
      />

      <AnimatePresence>
        {contractToRevoke && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-black/70"
              onClick={() => !revokeContractMutation.isPending && setContractToRevoke(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 bg-[#101012] rounded-2xl border border-white/20 p-6 w-full max-w-sm shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-white mb-2">Revoke contract?</h3>
              <p className="text-white/70 text-sm mb-6">
                This will revoke the contract and remove the member from the organization. They will lose access. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setContractToRevoke(null)}
                  disabled={revokeContractMutation.isPending}
                  className="flex-1 h-11 rounded-full border border-white/20 text-white hover:bg-white/5 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRevoke}
                  disabled={revokeContractMutation.isPending}
                  className="flex-1 h-11 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {revokeContractMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Revoke"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
