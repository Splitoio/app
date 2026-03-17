"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, CheckCircle2, Clock, Download, Eye, FileSignature } from "lucide-react";
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
import { useQueries } from "@tanstack/react-query";
import { getExchangeRate } from "@/features/currencies/api/client";
import { CURRENCY_QUERY_KEYS } from "@/features/currencies/hooks/use-currencies";
import { Card, SectionLabel, T, A, G } from "@/lib/splito-design";
import { cn } from "@/lib/utils";

function ContractStatusBadge({ contract }: { contract: Contract }) {
  const isSigned = !!contract.signedAt;
  const isRevoked = contract.status === "REVOKED";

  if (isRevoked) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={{ background: "rgba(251,146,60,0.12)", color: "#FB923C", border: "1px solid rgba(251,146,60,0.22)" }}>
      Revoked
    </span>
  );
  if (isSigned) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={{ background: "rgba(52,211,153,0.12)", color: G, border: "1px solid rgba(52,211,153,0.22)" }}>
      <CheckCircle2 className="h-2.5 w-2.5" /> Signed
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={{ background: "rgba(255,255,255,0.06)", color: T.muted, border: "1px solid rgba(255,255,255,0.09)" }}>
      <Clock className="h-2.5 w-2.5" /> Pending
    </span>
  );
}

export default function OrganizationContractsPage() {
  const params = useParams();
  const organizationId = params?.organizationId as string;
  const { isAdmin, openCreateContract } = useOrganizationOrg();
  const { user } = useAuthStore();
  const { data: contracts = [], isLoading: isContractsLoading } = useGetContractsByOrganization(organizationId);

  const defaultCurrency = user?.currency || "USD";
  const uniqueCurrencies = Array.from(
    new Set(contracts.map((c) => c.compensationCurrency ?? defaultCurrency))
  ).filter((c) => c !== defaultCurrency);
  const rateQueries = useQueries({
    queries: uniqueCurrencies.map((from) => ({
      queryKey: [CURRENCY_QUERY_KEYS.EXCHANGE_RATE, from, defaultCurrency],
      queryFn: () => getExchangeRate(from, defaultCurrency),
      staleTime: 1000 * 60 * 5,
      enabled: !!defaultCurrency && !!from,
    })),
  });
  const rateMap: Record<string, number> = { [defaultCurrency]: 1 };
  uniqueCurrencies.forEach((c, i) => {
    const rate = rateQueries[i]?.data?.rate;
    if (rate != null) rateMap[c] = rate;
  });
  const convert = (amount: number, currency: string) => amount * (rateMap[currency] ?? 1);
  const revokeContractMutation = useRevokeContract();
  const [contractToEdit, setContractToEdit] = useState<Contract | null>(null);
  const [contractToRevoke, setContractToRevoke] = useState<Contract | null>(null);
  const [contractToView, setContractToView] = useState<Contract | null>(null);
  const [contractToSign, setContractToSign] = useState<Contract | null>(null);

  const formatDate = (d: Date | null | undefined) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const handleRowClick = (c: Contract) => {
    const isAssignee = c.assignedToUserId === user?.id;
    if (!isAdmin && isAssignee && !c.signedAt) {
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

  const signed = contracts.filter((c) => !!c.signedAt && c.status !== "REVOKED");
  const pending = contracts.filter((c) => !c.signedAt && c.status !== "REVOKED");
  const revoked = contracts.filter((c) => c.status === "REVOKED");

  return (
    <div className="w-full space-y-5 sm:space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] sm:text-[22px] font-extrabold tracking-[-0.02em] text-white">
            {isAdmin ? "Contracts" : "My contracts"}
          </h1>
          <p className="text-[12px] font-medium mt-0.5" style={{ color: T.muted }}>
            {isContractsLoading ? "Loading…" : `${contracts.length} total · ${signed.length} signed`}
          </p>
        </div>
        {isAdmin && (
          <button onClick={openCreateContract}
            className="flex items-center gap-2 rounded-xl h-10 px-4 text-[13px] font-extrabold transition-all hover:opacity-90"
            style={{ background: A, color: "#0a0a0a" }}>
            <Plus className="h-4 w-4" /> New contract
          </button>
        )}
      </div>

      {/* ── Loading ── */}
      {isContractsLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-white/30" />
        </div>
      )}

      {/* ── Empty ── */}
      {!isContractsLoading && contracts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-[48px] mb-4">📋</div>
          <h2 className="text-[16px] font-bold text-white mb-2">No contracts yet</h2>
          <p className="text-[13px] mb-5" style={{ color: T.muted }}>
            {isAdmin ? "Create a contract to assign to a team member." : "No contracts assigned to you yet."}
          </p>
          {isAdmin && (
            <button onClick={openCreateContract}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-extrabold transition-all hover:opacity-90"
              style={{ background: A, color: "#0a0a0a" }}>
              <Plus className="h-4 w-4" /> Create contract
            </button>
          )}
        </div>
      )}

      {/* ── Summary hero ── */}
      {!isContractsLoading && contracts.length > 0 && (
        <div
          className="rounded-2xl sm:rounded-3xl border border-white/[0.09] p-5 sm:p-7 mb-5 sm:mb-6"
          style={{ background: "linear-gradient(135deg, #141414 0%, #0f0f0f 100%)", boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)" }}
        >
          <div className="grid grid-cols-3 gap-0">
            {[
              { label: "Total", value: String(contracts.length), accent: T.bright },
              { label: "Signed", value: String(signed.length), accent: G },
              { label: "Pending", value: String(pending.length), accent: "#22D3EE" },
            ].map((s, i, arr) => (
              <div key={s.label} className={cn("min-w-0 text-center", i > 0 ? "pl-4 sm:pl-6 border-l border-white/[0.07]" : "", i < arr.length - 1 ? "pr-4 sm:pr-6" : "")}>
                <p className="text-[10px] font-semibold tracking-[0.06em] uppercase mb-1.5" style={{ color: T.dim }}>{s.label}</p>
                <p className="text-[22px] sm:text-[24px] font-extrabold font-mono" style={{ color: s.accent }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Contract list ── */}
      {!isContractsLoading && contracts.length > 0 && (
        <div className="w-full mb-5 sm:mb-6">
          <SectionLabel className="mb-3">Contracts</SectionLabel>
          <Card className="w-full p-0 overflow-hidden">
          {contracts.map((c) => {
            const isSigned = !!c.signedAt;
            const isRevoked = c.status === "REVOKED";
            const isAssignee = c.assignedToUserId === user?.id;
            const canInteract = isAdmin || isAssignee;

            return (
              <div key={c.id}
                onClick={canInteract ? () => handleRowClick(c) : undefined}
                className={`w-full flex items-center gap-4 sm:gap-6 px-4 sm:px-6 py-4 border-b border-white/[0.06] last:border-b-0 transition-colors ${canInteract ? "cursor-pointer hover:bg-white/[0.015]" : ""} ${isRevoked ? "opacity-50" : ""}`}
              >
                {/* Icon */}
                <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={isSigned
                    ? { background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.2)" }
                    : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <FileSignature className="h-4 w-4" style={{ color: isSigned ? G : T.muted }} />
                </div>

                {/* Info - full width row: left block (title, meta), right block (amount + actions) */}
                <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[14px] font-bold truncate" style={{ color: T.bright }}>
                        {c.title || "Contract"}
                      </p>
                      {c.jobTitle && <span className="text-[12px]" style={{ color: T.dim }}>· {c.jobTitle}</span>}
                      <ContractStatusBadge contract={c} />
                    </div>
                    <p className="text-[12px] mt-1 truncate" style={{ color: T.muted }}>
                      {isAdmin
                        ? `Assigned to ${c.assignedTo?.name ?? c.assignedToEmail ?? "—"}`
                        : `From ${c.organization?.name ?? "organization"}`}
                      {c.compensationAmount != null && (
                        <> · <span className="font-mono font-semibold" style={{ color: T.body }}>
                          {formatCurrency(convert(c.compensationAmount, c.compensationCurrency ?? defaultCurrency), defaultCurrency)}
                          {c.paymentFrequency && `/${c.paymentFrequency.toLowerCase()}`}
                        </span></>
                      )}
                    </p>
                    {c.startDate && (
                      <p className="text-[11px] mt-0.5 font-medium" style={{ color: T.dim }}>
                        {formatDate(c.startDate)}{c.endDate ? ` → ${formatDate(c.endDate)}` : " · No end date"}
                      </p>
                    )}
                  </div>

                  {/* Action buttons - right side */}
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap" onClick={(e) => e.stopPropagation()}>
                    <button type="button" onClick={() => downloadContract(c)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold border transition-all hover:bg-white/5"
                      style={{ borderColor: "rgba(255,255,255,0.1)", color: T.muted }}>
                      <Download className="h-3 w-3" /> Download
                    </button>
                    {!isAdmin && isAssignee && !isSigned && !isRevoked && (
                      <button type="button" onClick={() => setContractToSign(c)}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold transition-all hover:opacity-80"
                        style={{ background: A, color: "#0a0a0a" }}>
                        <Eye className="h-3 w-3" /> View & sign
                      </button>
                    )}
                    {isAdmin && (
                      <>
                        <button type="button" onClick={() => setContractToView(c)}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold border transition-all hover:bg-white/5"
                          style={{ borderColor: "rgba(255,255,255,0.1)", color: T.muted }}>
                          <Eye className="h-3 w-3" /> View
                        </button>
                        {!isRevoked && (
                          <>
                            <button type="button" onClick={() => setContractToEdit(c)}
                              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold border transition-all hover:bg-white/5"
                              style={{ borderColor: "rgba(255,255,255,0.1)", color: T.muted }}>
                              <Pencil className="h-3 w-3" /> Edit
                            </button>
                            <button type="button" onClick={() => setContractToRevoke(c)}
                              disabled={revokeContractMutation.isPending}
                              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all hover:bg-red-500/10 disabled:opacity-50"
                              style={{ color: "#F87171" }}>
                              <Trash2 className="h-3 w-3" /> Revoke
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          </Card>
        </div>
      )}

      <EditContractModal isOpen={!!contractToEdit} onClose={() => setContractToEdit(null)} contract={contractToEdit} onSuccess={() => setContractToEdit(null)} />
      <ContractDetailModal isOpen={!!contractToView} onClose={() => setContractToView(null)} contract={contractToView} />
      <ContractGateModal isOpen={!!contractToSign} onClose={() => setContractToSign(null)} contract={contractToSign} />

      {/* ── Revoke confirm modal ── */}
      <AnimatePresence>
        {contractToRevoke && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70" onClick={() => !revokeContractMutation.isPending && setContractToRevoke(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-sm rounded-2xl p-6 shadow-2xl"
              style={{ background: "linear-gradient(145deg, #111 0%, #0d0d0d 100%)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.2)" }}>
                  <Trash2 className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold" style={{ color: T.bright }}>Revoke contract?</h3>
                  <p className="text-[12px] font-medium mt-0.5" style={{ color: T.muted }}>Cannot be undone</p>
                </div>
              </div>
              <p className="text-[13px] mb-5" style={{ color: T.body }}>
                This will revoke the contract and remove the member from the organization. They will lose access.
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setContractToRevoke(null)} disabled={revokeContractMutation.isPending}
                  className="flex-1 h-11 rounded-xl border font-semibold text-[13px] transition-all hover:bg-white/5 disabled:opacity-50"
                  style={{ borderColor: "rgba(255,255,255,0.12)", color: T.body }}>
                  Cancel
                </button>
                <button type="button" onClick={handleConfirmRevoke} disabled={revokeContractMutation.isPending}
                  className="flex-1 h-11 rounded-xl font-bold text-[13px] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "rgba(248,113,113,0.15)", color: "#F87171", border: "1px solid rgba(248,113,113,0.25)" }}>
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
