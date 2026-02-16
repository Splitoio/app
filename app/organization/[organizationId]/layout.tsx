"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
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
import { useGetContractById } from "@/features/business/hooks/use-contracts";
import { ReceiptImageModal } from "@/components/receipt-image-modal";
import { useDeleteGroup, useUpdateGroup } from "@/features/groups/hooks/use-create-group";
import { Loader2, Plus, Settings, Trash2 } from "lucide-react";
import { toast } from "sonner";
import CurrencyDropdown from "@/components/currency-dropdown";
import type { Currency } from "@/features/currencies/api/client";
import { OrganizationOrgProvider, useOrganizationOrg } from "@/contexts/organization-org-context";

function OrganizationLayoutInner({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const organizationId = params?.organizationId as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const contractIdFromUrl = searchParams.get("contractId");
  const openInvoiceFromUrl = searchParams.get("openInvoice");
  const { data: contractForInvoice } = useGetContractById(contractIdFromUrl && openInvoiceFromUrl === "1" ? contractIdFromUrl : null);
  const { user } = useAuthStore();
  const { data: group, isLoading } = useGetGroupById(organizationId, { type: "BUSINESS" });
  const isAdmin =
    group != null &&
    user != null &&
    (group.userId === user.id || (group as { createdBy?: { id: string } }).createdBy?.id === user.id);

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
      <div className="w-full">
        <div className="flex items-center justify-between py-4 sm:py-6 mb-4 sm:mb-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/organization/organizations" className="text-white/60 hover:text-white text-sm">
              ← Organizations
            </Link>
            <div className="h-12 w-12 sm:h-14 sm:w-14 overflow-hidden rounded-xl bg-white/[0.03]">
              {group.image ? (
                <Image src={group.image} alt={group.name} width={56} height={56} className="h-full w-full object-cover" />
              ) : (
                <Image src={`https://api.dicebear.com/9.x/identicon/svg?seed=${group.id}`} alt={group.name} width={56} height={56} className="h-full w-full" />
              )}
            </div>
            <div>
              <h1 className="text-mobile-xl sm:text-2xl font-semibold text-white">{group.name}</h1>
              <p className="text-white/60 text-sm">{(group.groupUsers || []).length} members</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isAdmin && (
              <button onClick={() => setIsAddInvoiceModalOpen(true)} className="flex items-center gap-2 rounded-full bg-white text-black h-10 sm:h-12 px-4 sm:px-6 text-sm font-medium hover:bg-white/90">
                <Plus className="h-4 w-4" />
                <span>Raise Invoice</span>
              </button>
            )}
            {isAdmin && (
              <button onClick={() => setIsSettingsModalOpen(true)} className="h-10 w-10 rounded-full border border-white/20 flex items-center justify-center text-white/70 hover:text-white">
                <Settings className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        <div className="bg-[#101012] rounded-xl sm:rounded-3xl min-h-[calc(100vh-200px)]">
          <div className="p-4 sm:p-6">{children}</div>
        </div>

        <AddInvoiceModal isOpen={isAddInvoiceModalOpen} onClose={() => setIsAddInvoiceModalOpen(false)} organizationId={organizationId} initialContract={contractForInvoice ?? undefined} />
        <CreateContractModal isOpen={isCreateContractModalOpen} onClose={() => setIsCreateContractModalOpen(false)} organizationId={organizationId} onSuccess={() => {}} />
        <AddMemberModal isOpen={isAddMemberModalOpen} onClose={() => setIsAddMemberModalOpen(false)} groupId={organizationId} />

        {declineInvoiceId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/70" onClick={() => { setDeclineInvoiceId(null); setDeclineNote(""); }} />
            <div className="relative z-10 bg-[#101012] rounded-2xl border border-white/20 p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-medium text-white mb-2">Decline invoice</h3>
              <p className="text-white/60 text-sm mb-4">Optionally add a reason (visible in activity).</p>
              <input type="text" value={declineNote} onChange={(e) => setDeclineNote(e.target.value)} placeholder="Reason" className="w-full px-4 py-2 rounded-lg bg-white/5 text-white border border-white/20 mb-4" />
              <div className="flex gap-2">
                <button onClick={() => { setDeclineInvoiceId(null); setDeclineNote(""); }} className="flex-1 py-2 rounded-full border border-white/20 text-white">Cancel</button>
                <button
                  onClick={() =>
                    declineInvoiceMutation.mutate(
                      { invoiceId: declineInvoiceId, note: declineNote || undefined },
                      { onSuccess: () => { toast.success("Invoice declined"); setDeclineInvoiceId(null); setDeclineNote(""); }, onError: () => toast.error("Failed to decline") }
                    )
                  }
                  disabled={declineInvoiceMutation.isPending}
                  className="flex-1 py-2 rounded-full bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30"
                >
                  {declineInvoiceMutation.isPending ? "Declining..." : "Decline"}
                </button>
              </div>
            </div>
          </div>
        )}

        {isSettingsModalOpen && (
          <div className="fixed inset-0 z-50 h-screen w-screen">
            <div className="fixed inset-0 bg-black/80 brightness-50" onClick={() => setIsSettingsModalOpen(false)} />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[450px] rounded-[20px] bg-black p-6 border border-white/20 z-10">
              <h2 className="text-xl font-medium text-white mb-6">Organization settings</h2>
              <form onSubmit={handleSettingsSubmit} className="space-y-4">
                <div>
                  <label className="block text-base text-white/80 mb-2">Organization Name</label>
                  <input type="text" value={groupSettings.name || group.name} onChange={(e) => setGroupSettings((p) => ({ ...p, name: e.target.value }))} className="w-full px-4 py-2 rounded-lg bg-[#1A1A1C] text-white border border-white/20" />
                </div>
                <div>
                  <label className="block text-base text-white/80 mb-2">Default Currency</label>
                  <CurrencyDropdown selectedCurrencies={groupSettings.currency ? [groupSettings.currency] : []} setSelectedCurrencies={(currencies) => setGroupSettings((prev) => ({ ...prev, currency: currencies[0] || "" }))} mode="single" showFiatCurrencies={true} filterCurrencies={(c: Currency) => c.symbol !== "ETH" && c.symbol !== "USDC"} disableChainCurrencies={true} />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setIsSettingsModalOpen(false)} className="px-4 py-2 rounded-lg text-white/80 hover:text-white">Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded-lg bg-white text-black hover:bg-white/90">Save</button>
                </div>
              </form>
              <div className="mt-8 pt-6 border-t border-white/20">
                <button onClick={handleDeleteOrganization} className="flex items-center gap-2 text-red-500 hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Organization</span>
                </button>
              </div>
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
