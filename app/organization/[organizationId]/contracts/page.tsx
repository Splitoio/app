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
import { Card, SectionLabel, T, A, Tag, G } from "@/lib/splito-design";

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
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <SectionLabel>{isAdmin ? "Contracts" : "My contracts"}</SectionLabel>
        {isAdmin && (
          <button
            onClick={openCreateContract}
            className="flex items-center gap-2 rounded-xl h-9 sm:h-10 px-3 sm:px-4 text-sm font-extrabold transition-all hover:opacity-90"
            style={{ background: A, color: "#0a0a0a" }}
          >
            <Plus className="h-4 w-4" />
            Create contract
          </button>
        )}
      </div>

      {isContractsLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-white/50" />
        </div>
      ) : contracts.length > 0 ? (
        <div className="space-y-3">
          {contracts.map((c) => {
            const isSigned = !!c.signedAt;
            const isRevoked = c.status === "REVOKED";
            const isAssignee = c.assignedToUserId === user?.id;

            return (
              <div
                key={c.id}
                role={isAdmin || isAssignee ? "button" : undefined}
                onClick={isAdmin || isAssignee ? () => handleRowClick(c) : undefined}
                className={isAdmin || isAssignee ? "cursor-pointer" : ""}
              >
              <Card className="p-4 sm:p-5 hover:bg-white/[0.03] transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Left: info */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold" style={{ color: T.bright }}>{c.title || "Contract"}</p>
                      {c.jobTitle && <span className="text-xs" style={{ color: T.dim }}>· {c.jobTitle}</span>}
                      {isRevoked ? (
                        <Tag color="#FB923C">Revoked</Tag>
                      ) : isSigned ? (
                        <Tag color={G}><CheckCircle2 className="h-3 w-3 inline mr-0.5" /> Signed {formatDate(c.signedAt)}</Tag>
                      ) : (
                        <Tag color={T.muted}><Clock className="h-3 w-3 inline mr-0.5" /> Awaiting signature</Tag>
                      )}
                    </div>
                    <p className="text-sm" style={{ color: T.muted }}>
                      {isAdmin
                        ? `Assigned to ${c.assignedTo?.name ?? c.assignedToEmail}`
                        : `From ${c.organization?.name ?? "organization"}`}
                      {c.compensationAmount != null &&
                        ` · ${formatCurrencyLocal(c.compensationAmount, c.compensationCurrency ?? "USD")}${c.paymentFrequency ? " / " + c.paymentFrequency.toLowerCase() : ""}`}
                    </p>
                    {c.startDate && (
                      <p className="text-xs" style={{ color: T.dim }}>
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
              </Card>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="p-8 sm:p-12 text-center">
          <p className="text-[15px] font-semibold" style={{ color: T.muted }}>
            {isAdmin ? "No contracts yet. Create one to assign to someone by email." : "No contracts assigned to you."}
          </p>
        </Card>
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
