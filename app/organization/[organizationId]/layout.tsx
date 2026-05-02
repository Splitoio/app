"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useAuthStore } from "@/stores/authStore";
import { useGetGroupById } from "@/features/groups/hooks/use-create-group";
import {
  useUpdateInvoice,
  useDeleteInvoice,
  useApproveInvoice,
  useDeclineInvoice,
  useClearInvoice,
} from "@/features/business/hooks/use-invoices";
import {
  useGetStreamsByOrganization,
  useCreateStream,
  useUpdateStream,
  useDeleteStream,
} from "@/features/business/hooks/use-streams";
import type { IncomeStream } from "@/features/business/api/client";
import { AddInvoiceModal } from "@/components/add-invoice-modal";
import { EditInvoiceModal, type InvoiceForEdit } from "@/components/edit-invoice-modal";
import { AddMemberModal } from "@/components/add-member-modal";
import { CreateContractModal } from "@/components/create-contract-modal";
import { useGetMyContracts } from "@/features/business/hooks/use-contracts";
import { ContractGateModal } from "@/components/contract-gate-modal";
import { ReceiptImageModal } from "@/components/receipt-image-modal";
import { useDeleteGroup, useUpdateGroup } from "@/features/groups/hooks/use-create-group";
import { Loader2, Settings, Trash2, XCircle, FileText } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import CurrencyDropdown from "@/components/currency-dropdown";
import type { Currency } from "@/features/currencies/api/client";
import { OrganizationOrgProvider, useOrganizationOrg } from "@/contexts/organization-org-context";
import { Card, Btn, T, A } from "@/lib/splito-design";
import { motion, AnimatePresence } from "framer-motion";

function OrganizationLayoutInner({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const organizationId = params?.organizationId as string;
  const router = useRouter();

  const isSettingsPage = pathname?.endsWith("/settings");
  const { user } = useAuthStore();
  const { data: group, isLoading } = useGetGroupById(organizationId, { type: "BUSINESS" });
  const { data: myContracts = [] } = useGetMyContracts();
  const [pendingContractModalOpen, setPendingContractModalOpen] = useState(false);
  const isAdmin =
    group != null &&
    user != null &&
    (group.userId === user.id ||
      (group as { createdBy?: { id: string } }).createdBy?.id === user.id ||
      (group.groupUsers as { userId: string; role?: string | null }[] | undefined)?.find((gu) => gu.userId === user.id)?.role === "ADMIN");

  const [isAddInvoiceModalOpen, setIsAddInvoiceModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [declineInvoiceId, setDeclineInvoiceId] = useState<string | null>(null);
  const [declineNote, setDeclineNote] = useState("");
  const [groupSettings, setGroupSettings] = useState({ name: "" });
  const [expandedImage, setExpandedImage] = useState<{ url: string; description: string } | null>(null);
  const [invoiceToEdit, setInvoiceToEdit] = useState<InvoiceForEdit | null>(null);
  const [isStreamModalOpen, setIsStreamModalOpen] = useState(false);
  const [streamToEdit, setStreamToEdit] = useState<IncomeStream | null>(null);
  const [streamForm, setStreamForm] = useState({ name: "", currency: "USD", amount: "" as string | number, description: "", receivedDate: new Date().toISOString().slice(0, 10) });
  const [isCreateContractModalOpen, setIsCreateContractModalOpen] = useState(false);

  const updateGroupMutation = useUpdateGroup();
  const deleteGroupMutation = useDeleteGroup();
  const declineInvoiceMutation = useDeclineInvoice();
  const createStreamMutation = useCreateStream();
  const updateStreamMutation = useUpdateStream();
  const deleteStreamMutation = useDeleteStream();

  useEffect(() => {
    if (group) {
      setGroupSettings((prev) => ({ ...prev, name: group.name }));
    }
  }, [group]);


  if (isSettingsPage) {
    return <>{children}</>;
  }

  const handleDeleteOrganization = () => {
    deleteGroupMutation.mutate(organizationId, {
      onSuccess: () => {
        toast.success("Organization deleted");
        router.push("/organization/organizations");
      },
      onError: (e: { message?: string }) => toast.error(e?.message || "Failed to delete"),
    });
  };

  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateGroupMutation.mutate(
      { groupId: organizationId, payload: { name: groupSettings.name } },
      {
        onSuccess: () => {
          toast.success("Organization settings updated");
          setIsSettingsModalOpen(false);
        },
        onError: () => toast.error("Failed to update"),
      }
    );
  };

  const openAddStreamModal = () => {
    setStreamToEdit(null);
    setStreamForm({ name: "", currency: "USD", amount: "", description: "", receivedDate: new Date().toISOString().slice(0, 10) });
    setIsStreamModalOpen(true);
  };

  const openEditStreamModal = (stream: IncomeStream) => {
    setStreamToEdit(stream);
    setStreamForm({
      name: stream.name,
      currency: stream.currency,
      amount: stream.amount,
      description: stream.description ?? "",
      receivedDate: new Date(stream.receivedDate).toISOString().slice(0, 10),
    });
    setIsStreamModalOpen(true);
  };

  const handleStreamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = streamForm.amount === "" ? NaN : Number(streamForm.amount);
    if (!streamForm.name.trim() || !Number.isFinite(amountNum) || amountNum < 0) {
      toast.error("Enter a source and a valid amount");
      return;
    }
    if (streamToEdit) {
      updateStreamMutation.mutate(
        { organizationId, streamId: streamToEdit.id, payload: { name: streamForm.name.trim(), currency: streamForm.currency, amount: amountNum, description: streamForm.description.trim() || null, receivedDate: streamForm.receivedDate } },
        { onSuccess: () => { toast.success("Income updated"); setIsStreamModalOpen(false); setStreamToEdit(null); }, onError: () => toast.error("Failed to update income") }
      );
    } else {
      createStreamMutation.mutate(
        { organizationId, payload: { name: streamForm.name.trim(), currency: streamForm.currency, amount: amountNum, description: streamForm.description.trim() || undefined, receivedDate: streamForm.receivedDate } },
        { onSuccess: () => { toast.success("Income logged"); setIsStreamModalOpen(false); }, onError: () => toast.error("Failed to log income") }
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-10 w-10 animate-spin text-white/50" />
      </div>
    );
  }
  if (!group || !user) return null;

  // Contract gate: only employees with a signed contract can view the org
  const contractsForOrg = myContracts.filter((c) => c.organizationId === organizationId);
  const hasSignedContract = contractsForOrg.some((c) => c.signedAt);
  const rejectedOnly = contractsForOrg.length > 0 && contractsForOrg.every((c) => c.status === "REJECTED");
  const pendingContract = contractsForOrg.find(
    (c) => (c.status === "SENT" || c.status === "DRAFT") && !c.signedAt && c.assignedToUserId === user.id
  );

  if (!isAdmin) {
    if (rejectedOnly) {
      return (
        <div className="flex items-center justify-center min-h-[60vh] p-4">
          <div className="max-w-md text-center">
            <XCircle className="h-16 w-16 text-red-400/80 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-white mb-2">You have rejected the contract</h1>
            <p className="text-white/70 mb-6">
              You do not have access to {group.name}. Only members who accept their contract can view the organization.
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
    if (pendingContract && !hasSignedContract) {
      return (
        <>
          <div className="flex items-center justify-center min-h-[60vh] p-4">
            <div className="max-w-md text-center">
              <h1 className="text-xl font-semibold text-white mb-2">Contract pending</h1>
              <p className="text-white/70 mb-6">
                You have a pending contract for {group.name}. View the contract to accept or reject it and access the organization.
              </p>
              <button
                type="button"
                onClick={() => setPendingContractModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white text-black px-6 py-3 font-medium hover:bg-white/90"
              >
                <FileText className="h-5 w-5" />
                View contract
              </button>
            </div>
          </div>
          <ContractGateModal
            isOpen={pendingContractModalOpen}
            onClose={() => setPendingContractModalOpen(false)}
            contract={pendingContract}
            onReject={() => router.push("/organization")}
          />
        </>
      );
    }
    if (!hasSignedContract) {
      return (
        <div className="flex items-center justify-center min-h-[60vh] p-4">
          <div className="max-w-md text-center">
            <h1 className="text-xl font-semibold text-white mb-2">Access required</h1>
            <p className="text-white/70 mb-6">
              You need to accept a contract to access {group.name}. Check your email for the contract link from the organization admin.
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
  }

  const contextValue = {
    organizationId,
    group: { id: group.id, name: group.name, image: group.image, groupUsers: group.groupUsers, createdBy: (group as { createdBy?: { id: string } }).createdBy, userId: group.userId },
    isAdmin: !!isAdmin,
    openAddInvoice: () => setIsAddInvoiceModalOpen(true),
    openDecline: (id: string) => setDeclineInvoiceId(id),
    setInvoiceToEdit,
    setExpandedImage,
    openAddMember: () => setIsAddMemberModalOpen(true),
    openCreateContract: () => setIsCreateContractModalOpen(true),
    openSettings: () => setIsSettingsModalOpen(true),
    openStreamModal: openAddStreamModal,
    openEditStream: openEditStreamModal,
  };

  return (
    <OrganizationOrgProvider value={contextValue}>
      <div className="w-full flex flex-col min-w-0">
        {/* Sticky header – design language (matches Dashboard/personal), responsive */}
        <div
          className="border-b border-white/[0.07] flex items-center justify-between h-14 sm:h-[70px] px-4 sm:px-7 sticky top-0 bg-[#0b0b0b]/95 backdrop-blur-xl z-10"
        >
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="h-12 w-12 sm:h-14 sm:w-14 overflow-hidden rounded-xl flex-shrink-0 border border-white/[0.08] bg-white/[0.03]">
              {group.image ? (
                <Image src={group.image} alt={group.name} width={56} height={56} className="h-full w-full object-cover" />
              ) : (
                <Image src={`https://api.dicebear.com/9.x/identicon/svg?seed=${group.id}`} alt={group.name} width={56} height={56} className="h-full w-full" />
              )}
            </div>
            <div className="min-w-0">
            <h1 className="text-[18px] sm:text-[20px] font-extrabold tracking-[-0.02em] text-white truncate">{group.name}</h1>
            <p style={{ color: T.muted, fontSize: 12, fontWeight: 600 }}>{(group.groupUsers || []).length} members</p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.11)",
                  background: "rgba(255,255,255,0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: T.body,
                  cursor: "pointer",
                }}
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 p-4 sm:p-7 overflow-y-auto min-h-0">
          {children}
        </div>

        <AddInvoiceModal isOpen={isAddInvoiceModalOpen} onClose={() => setIsAddInvoiceModalOpen(false)} organizationId={organizationId} />
        <CreateContractModal isOpen={isCreateContractModalOpen} onClose={() => setIsCreateContractModalOpen(false)} organizationId={organizationId} onSuccess={() => {}} />
        <AddMemberModal isOpen={isAddMemberModalOpen} onClose={() => setIsAddMemberModalOpen(false)} groupId={organizationId} label="Admin" />

        <AnimatePresence>
          {declineInvoiceId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="absolute inset-0 bg-black/70" onClick={() => { setDeclineInvoiceId(null); setDeclineNote(""); }} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative z-10 w-full max-w-sm rounded-2xl p-6 shadow-2xl"
                style={{ background: "linear-gradient(145deg, #111 0%, #0d0d0d 100%)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold mb-2" style={{ color: T.bright }}>Decline invoice</h3>
                <p className="text-sm mb-4" style={{ color: T.body }}>Optionally add a reason (visible in activity).</p>
                <input
                  type="text"
                  value={declineNote}
                  onChange={(e) => setDeclineNote(e.target.value)}
                  placeholder="Reason"
                  className="w-full rounded-xl outline-none mb-4 font-medium"
                  style={{ padding: "12px 14px", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.09)", color: "#fff", fontSize: 14 }}
                />
                <div className="flex gap-3">
                  <Btn variant="ghost" onClick={() => { setDeclineInvoiceId(null); setDeclineNote(""); }} style={{ flex: 1 }}>Cancel</Btn>
                  <Btn
                    variant="danger"
                    onClick={() =>
                      declineInvoiceMutation.mutate(
                        { invoiceId: declineInvoiceId, note: declineNote || undefined },
                        { onSuccess: () => { toast.success("Invoice declined"); setDeclineInvoiceId(null); setDeclineNote(""); }, onError: () => toast.error("Failed to decline") }
                      )
                    }
                    style={{ flex: 1, opacity: declineInvoiceMutation.isPending ? 0.7 : 1, cursor: declineInvoiceMutation.isPending ? "not-allowed" : "pointer" }}
                  >
                    {declineInvoiceMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Declining...</> : "Decline"}
                  </Btn>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isSettingsModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsSettingsModalOpen(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative z-10 w-full max-w-[450px] rounded-2xl p-6"
                style={{ background: "linear-gradient(145deg, #111 0%, #0d0d0d 100%)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-xl font-extrabold tracking-[-0.02em] mb-6" style={{ color: T.bright }}>Organization settings</h2>
                <form onSubmit={handleSettingsSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: T.soft }}>Organization Name</label>
                    <input
                      type="text"
                      value={groupSettings.name || group.name}
                      onChange={(e) => setGroupSettings((p) => ({ ...p, name: e.target.value }))}
                      className="w-full rounded-xl outline-none font-medium"
                      style={{ padding: "12px 14px", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.09)", color: T.bright, fontSize: 14 }}
                    />
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <Btn variant="ghost" onClick={() => setIsSettingsModalOpen(false)}>Cancel</Btn>
                    <button
                      type="submit"
                      style={{ padding: "9px 22px", borderRadius: 12, background: A, color: "#0a0a0a", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit", border: "none" }}
                    >
                      Save
                    </button>
                  </div>
                </form>
                {isAdmin && (
                  <div className="mt-8 pt-6 border-t border-white/[0.07]">
                    <button
                      onClick={handleDeleteOrganization}
                      className="flex items-center gap-2 font-semibold text-sm transition-colors"
                      style={{ color: "#F87171" }}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete Organization</span>
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <ReceiptImageModal isOpen={!!expandedImage} onClose={() => setExpandedImage(null)} imageUrl={expandedImage?.url ?? ""} description={expandedImage?.description ?? "Invoice"} />
        <EditInvoiceModal isOpen={!!invoiceToEdit} onClose={() => setInvoiceToEdit(null)} invoice={invoiceToEdit} onSuccess={() => setInvoiceToEdit(null)} />

        <AnimatePresence>
          {isStreamModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="absolute inset-0 bg-black/70" onClick={() => { setIsStreamModalOpen(false); setStreamToEdit(null); }} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative z-10 w-full max-w-md rounded-2xl p-6 shadow-2xl"
                style={{ background: "linear-gradient(145deg, #111 0%, #0d0d0d 100%)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-xl font-extrabold tracking-[-0.02em] mb-1" style={{ color: T.bright }}>{streamToEdit ? "Edit income" : "Log income received"}</h2>
                <p className="text-[12px] mb-5" style={{ color: T.muted }}>{streamToEdit ? "Update this entry in your treasury." : "Record money you actually received — this fills your treasury."}</p>
                <form onSubmit={handleStreamSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: T.soft }}>Source / From</label>
                    <input type="text" value={streamForm.name} onChange={(e) => setStreamForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Client A, Stripe payout" className="w-full rounded-xl px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/40 outline-none focus:border-white/20" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: T.soft }}>Amount received</label>
                      <input type="number" step="any" min="0" value={streamForm.amount} onChange={(e) => setStreamForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0" className="w-full rounded-xl px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/40 outline-none focus:border-white/20" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: T.soft }}>Currency</label>
                      <CurrencyDropdown
                        selectedCurrencies={streamForm.currency ? [streamForm.currency] : []}
                        setSelectedCurrencies={(currencies) => setStreamForm((p) => ({ ...p, currency: currencies[0] || "USD" }))}
                        mode="single"
                        showFiatCurrencies={true}
                        filterCurrencies={(c: Currency) => c.symbol !== "ETH" && c.symbol !== "USDC"}
                        disableChainCurrencies={true}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: T.soft }}>Note <span className="opacity-50 font-normal">(optional)</span></label>
                    <input type="text" value={streamForm.description} onChange={(e) => setStreamForm((p) => ({ ...p, description: e.target.value }))} placeholder="e.g. Q1 retainer" className="w-full rounded-xl px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/40 outline-none focus:border-white/20" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: T.soft }}>Received on</label>
                    <input type="date" value={streamForm.receivedDate} onChange={(e) => setStreamForm((p) => ({ ...p, receivedDate: e.target.value }))} className="w-full rounded-xl px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] text-white outline-none focus:border-white/20 [color-scheme:dark]" required />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Btn variant="ghost" className="flex-1" onClick={() => { setIsStreamModalOpen(false); setStreamToEdit(null); }}>Cancel</Btn>
                    <button type="submit" disabled={createStreamMutation.isPending || updateStreamMutation.isPending} className="flex-1 rounded-xl py-2.5 font-semibold text-sm disabled:opacity-50" style={{ background: A, color: "#0a0a0a" }}>
                      {streamToEdit
                        ? (updateStreamMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Save changes")
                        : (createStreamMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Log income")}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </OrganizationOrgProvider>
  );
}

export default function OrganizationIdLayout({ children }: { children: React.ReactNode }) {
  return <OrganizationLayoutInner>{children}</OrganizationLayoutInner>;
}
