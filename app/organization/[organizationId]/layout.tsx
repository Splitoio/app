"use client";

import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { useGetContractById, useGetMyContracts } from "@/features/business/hooks/use-contracts";
import { ContractGateModal } from "@/components/contract-gate-modal";
import { ReceiptImageModal } from "@/components/receipt-image-modal";
import { useDeleteGroup, useUpdateGroup } from "@/features/groups/hooks/use-create-group";
import { Loader2, Plus, Settings, Trash2, XCircle, FileText } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import CurrencyDropdown from "@/components/currency-dropdown";
import type { Currency } from "@/features/currencies/api/client";
import { OrganizationOrgProvider, useOrganizationOrg } from "@/contexts/organization-org-context";
import { Card, Btn, T, A } from "@/lib/splito-design";

function OrganizationLayoutInner({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const organizationId = params?.organizationId as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSettingsPage = pathname?.endsWith("/settings");
  const contractIdFromUrl = searchParams.get("contractId");
  const openInvoiceFromUrl = searchParams.get("openInvoice");
  const { data: contractForInvoice } = useGetContractById(contractIdFromUrl && openInvoiceFromUrl === "1" ? contractIdFromUrl : null);
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
  const [groupSettings, setGroupSettings] = useState({ name: "", currency: "USD" });
  const [expandedImage, setExpandedImage] = useState<{ url: string; description: string } | null>(null);
  const [invoiceToEdit, setInvoiceToEdit] = useState<InvoiceForEdit | null>(null);
  const [isStreamModalOpen, setIsStreamModalOpen] = useState(false);
  const [streamToEdit, setStreamToEdit] = useState<IncomeStream | null>(null);
  const [streamForm, setStreamForm] = useState({ name: "", currency: "USD", expectedAmount: "" as string | number, description: "" });
  const [isCreateContractModalOpen, setIsCreateContractModalOpen] = useState(false);

  const updateGroupMutation = useUpdateGroup();
  const deleteGroupMutation = useDeleteGroup();
  const declineInvoiceMutation = useDeclineInvoice();
  const createStreamMutation = useCreateStream();
  const updateStreamMutation = useUpdateStream();
  const deleteStreamMutation = useDeleteStream();

  useEffect(() => {
    if (group) {
      setGroupSettings((prev) => ({ ...prev, name: group.name, currency: group.defaultCurrency || "USD" }));
    }
  }, [group]);

  useEffect(() => {
    if (openInvoiceFromUrl === "1" && contractIdFromUrl) {
      setIsAddInvoiceModalOpen(true);
      const u = new URL(window.location.href);
      u.searchParams.delete("openInvoice");
      u.searchParams.delete("contractId");
      router.replace(u.pathname + u.search, { scroll: false });
    }
  }, [openInvoiceFromUrl, contractIdFromUrl, router]);

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
      { groupId: organizationId, payload: { name: groupSettings.name, currency: groupSettings.currency } },
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
    setStreamForm({ name: "", currency: "USD", expectedAmount: "", description: "" });
    setIsStreamModalOpen(true);
  };

  const openEditStreamModal = (stream: IncomeStream) => {
    setStreamToEdit(stream);
    setStreamForm({
      name: stream.name,
      currency: stream.currency,
      expectedAmount: stream.expectedAmount ?? "",
      description: stream.description ?? "",
    });
    setIsStreamModalOpen(true);
  };

  const handleStreamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const expectedNum = streamForm.expectedAmount === "" ? null : Number(streamForm.expectedAmount);
    if (streamToEdit) {
      updateStreamMutation.mutate(
        { organizationId, streamId: streamToEdit.id, payload: { name: streamForm.name.trim(), currency: streamForm.currency, expectedAmount: expectedNum, description: streamForm.description.trim() || null } },
        { onSuccess: () => { toast.success("Stream updated"); setIsStreamModalOpen(false); setStreamToEdit(null); }, onError: () => toast.error("Failed to update stream") }
      );
    } else {
      createStreamMutation.mutate(
        { organizationId, payload: { name: streamForm.name.trim(), currency: streamForm.currency, expectedAmount: expectedNum ?? undefined, description: streamForm.description.trim() || undefined } },
        { onSuccess: () => { toast.success("Stream added"); setIsStreamModalOpen(false); }, onError: () => toast.error("Failed to add stream") }
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
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isAdmin && (
              <button
                onClick={() => setIsAddInvoiceModalOpen(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  height: 40,
                  padding: "0 18px",
                  borderRadius: 12,
                  background: A,
                  color: "#0a0a0a",
                  border: "none",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <Plus className="h-4 w-4" />
                <span>Raise Invoice</span>
              </button>
            )}
            {isAdmin && (
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
            )}
          </div>
        </div>

        <div className="flex-1 p-4 sm:p-7 overflow-y-auto min-h-0">
          {children}
        </div>

        <AddInvoiceModal isOpen={isAddInvoiceModalOpen} onClose={() => setIsAddInvoiceModalOpen(false)} organizationId={organizationId} initialContract={contractForInvoice ?? undefined} />
        <CreateContractModal isOpen={isCreateContractModalOpen} onClose={() => setIsCreateContractModalOpen(false)} organizationId={organizationId} onSuccess={() => {}} />
        <AddMemberModal isOpen={isAddMemberModalOpen} onClose={() => setIsAddMemberModalOpen(false)} groupId={organizationId} />

        {declineInvoiceId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/70" onClick={() => { setDeclineInvoiceId(null); setDeclineNote(""); }} />
            <div className="relative z-10 w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ background: "linear-gradient(145deg, #111 0%, #0d0d0d 100%)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)" }} onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: T.bright }}>Decline invoice</h3>
              <p className="text-sm mb-4" style={{ color: T.body }}>Optionally add a reason (visible in activity).</p>
              <input
                type="text"
                value={declineNote}
                onChange={(e) => setDeclineNote(e.target.value)}
                placeholder="Reason"
                className="w-full rounded-xl border outline-none mb-4 font-medium"
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
            </div>
          </div>
        )}

        {isSettingsModalOpen && (
          <div className="fixed inset-0 z-50 h-screen w-screen">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsSettingsModalOpen(false)} />
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[450px] rounded-2xl p-6 z-10"
              style={{ background: "linear-gradient(145deg, #111 0%, #0d0d0d 100%)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)" }}
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
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: T.soft }}>Default Currency</label>
                  <CurrencyDropdown selectedCurrencies={groupSettings.currency ? [groupSettings.currency] : []} setSelectedCurrencies={(currencies) => setGroupSettings((prev) => ({ ...prev, currency: currencies[0] || "" }))} mode="single" showFiatCurrencies={true} filterCurrencies={(c: Currency) => c.symbol !== "ETH" && c.symbol !== "USDC"} disableChainCurrencies={true} />
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
            </div>
          </div>
        )}

        <ReceiptImageModal isOpen={!!expandedImage} onClose={() => setExpandedImage(null)} imageUrl={expandedImage?.url ?? ""} description={expandedImage?.description ?? "Invoice"} />
        <EditInvoiceModal isOpen={!!invoiceToEdit} onClose={() => setInvoiceToEdit(null)} invoice={invoiceToEdit} onSuccess={() => setInvoiceToEdit(null)} />

        {isStreamModalOpen && (
          <div className="fixed inset-0 z-50 h-screen w-screen">
            <div className="fixed inset-0 bg-black/80 brightness-50" onClick={() => { setIsStreamModalOpen(false); setStreamToEdit(null); }} />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[450px] rounded-[20px] bg-black p-6 border border-white/20 z-10">
              <h2 className="text-xl font-medium text-white mb-6">{streamToEdit ? "Edit stream" : "Add income stream"}</h2>
              <form onSubmit={handleStreamSubmit} className="space-y-4">
                <div>
                  <label className="block text-base text-white/80 mb-2">Name</label>
                  <input type="text" value={streamForm.name} onChange={(e) => setStreamForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Client A" className="w-full px-4 py-2 rounded-lg bg-[#1A1A1C] text-white border border-white/20" required />
                </div>
                <div>
                  <label className="block text-base text-white/80 mb-2">Currency</label>
                  <CurrencyDropdown
                    selectedCurrencies={streamForm.currency ? [streamForm.currency] : []}
                    setSelectedCurrencies={(currencies) =>
                      setStreamForm((p) => ({ ...p, currency: currencies[0] || "USD" }))
                    }
                    mode="single"
                    showFiatCurrencies={true}
                    filterCurrencies={(c: Currency) => c.symbol !== "ETH" && c.symbol !== "USDC"}
                    disableChainCurrencies={true}
                  />
                </div>
                <div>
                  <label className="block text-base text-white/80 mb-2">Amount</label>
                  <input type="number" step="any" min="0" value={streamForm.expectedAmount} onChange={(e) => setStreamForm((p) => ({ ...p, expectedAmount: e.target.value }))} placeholder="0" className="w-full px-4 py-2 rounded-lg bg-[#1A1A1C] text-white border border-white/20" />
                </div>
                <div>
                  <label className="block text-base text-white/80 mb-2">Description</label>
                  <input type="text" value={streamForm.description} onChange={(e) => setStreamForm((p) => ({ ...p, description: e.target.value }))} placeholder="Notes" className="w-full px-4 py-2 rounded-lg bg-[#1A1A1C] text-white border border-white/20" />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => { setIsStreamModalOpen(false); setStreamToEdit(null); }} className="px-4 py-2 rounded-lg text-white/80 hover:text-white">Cancel</button>
                  <button type="submit" disabled={createStreamMutation.isPending || updateStreamMutation.isPending} className="px-4 py-2 rounded-lg bg-white text-black hover:bg-white/90 disabled:opacity-50">
                    {streamToEdit ? (updateStreamMutation.isPending ? "Saving…" : "Save") : (createStreamMutation.isPending ? "Adding…" : "Add stream")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </OrganizationOrgProvider>
  );
}

export default function OrganizationIdLayout({ children }: { children: React.ReactNode }) {
  return <OrganizationLayoutInner>{children}</OrganizationLayoutInner>;
}
