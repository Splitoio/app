"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { useGetGroupById } from "@/features/groups/hooks/use-create-group";
import {
  useGetInvoicesByOrganization,
  useUpdateInvoice,
  useDeleteInvoice,
  useApproveInvoice,
  useDeclineInvoice,
  useClearInvoice,
  useGetOrganizationActivity,
} from "@/features/business/hooks/use-invoices";
import { AddInvoiceModal } from "@/components/add-invoice-modal";
import { EditInvoiceModal, type InvoiceForEdit } from "@/components/edit-invoice-modal";
import { AddMemberModal } from "@/components/add-member-modal";
import { ReceiptImageModal } from "@/components/receipt-image-modal";
import { useDeleteGroup, useUpdateGroup } from "@/features/groups/hooks/use-create-group";
import { Loader2, Plus, Settings, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function OrganizationDetailPage({ params }: { params: { id: string } }) {
  const organizationId = params.id;
  const { user } = useAuthStore();
  const router = useRouter();
  const { data: group, isLoading } = useGetGroupById(organizationId, { type: "BUSINESS" });
  const { data: invoices = [], isLoading: isInvoicesLoading } = useGetInvoicesByOrganization(organizationId);
  const { data: activities = [], isLoading: isActivityLoading } = useGetOrganizationActivity(organizationId);
  const [isAddInvoiceModalOpen, setIsAddInvoiceModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [declineInvoiceId, setDeclineInvoiceId] = useState<string | null>(null);
  const [declineNote, setDeclineNote] = useState("");
  const [activeTab, setActiveTab] = useState<"invoices" | "members" | "activity">("invoices");
  const [groupSettings, setGroupSettings] = useState({ name: "", currency: "USD" });
  const [expandedImage, setExpandedImage] = useState<{ url: string; description: string } | null>(null);
  const [invoiceToEdit, setInvoiceToEdit] = useState<InvoiceForEdit | null>(null);

  useEffect(() => {
    if (group) {
      setGroupSettings((prev) => ({
        ...prev,
        name: group.name,
        currency: group.defaultCurrency || "USD",
      }));
    }
  }, [group]);

  const deleteGroupMutation = useDeleteGroup();
  const updateGroupMutation = useUpdateGroup();
  const updateInvoiceMutation = useUpdateInvoice();
  const deleteInvoiceMutation = useDeleteInvoice();
  const approveInvoiceMutation = useApproveInvoice();
  const declineInvoiceMutation = useDeclineInvoice();
  const clearInvoiceMutation = useClearInvoice();

  const formatCurrencyLocal = (amount: number, currency: string) => formatCurrency(amount, currency);

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

  const handleRemoveMember = async (memberId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/groups/${organizationId}/members/${memberId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to remove member");
      toast.success("Member removed");
      window.location.reload();
    } catch {
      toast.error("Failed to remove member");
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

  const members = (group.groupUsers || []).map((gu: { user: { id: string; name: string | null; image: string | null; email: string | null } }) => gu.user);
  const isAdmin = group.userId === user.id || (group as { createdBy?: { id: string } }).createdBy?.id === user.id;

  const activityLabel = (type: string) => {
    switch (type) {
      case "INVOICE_RAISED":
        return "raised an invoice";
      case "INVOICE_APPROVED":
        return "approved an invoice";
      case "INVOICE_DECLINED":
        return "declined an invoice";
      case "INVOICE_CLEARED":
        return "cleared an invoice";
      default:
        return type;
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
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
            <button
              onClick={() => setIsAddInvoiceModalOpen(true)}
              className="flex items-center gap-2 rounded-full bg-white text-black h-10 sm:h-12 px-4 sm:px-6 text-sm font-medium hover:bg-white/90"
            >
              <Plus className="h-4 w-4" />
              <span>Raise Invoice</span>
            </button>
          )}
          <button onClick={() => setIsSettingsModalOpen(true)} className="h-10 w-10 rounded-full border border-white/20 flex items-center justify-center text-white/70 hover:text-white">
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="bg-[#101012] rounded-xl sm:rounded-3xl min-h-[calc(100vh-200px)]">
        <div className="flex px-3 sm:px-4 pt-3 sm:pt-4 pb-2 gap-1 sm:gap-2 overflow-x-auto">
          <button
            className={`px-4 sm:px-6 py-1.5 sm:py-2 text-mobile-base sm:text-lg font-medium transition-colors rounded-full ${activeTab === "invoices" ? "bg-[#333] text-white" : "text-white/60 hover:text-white/80"}`}
            onClick={() => setActiveTab("invoices")}
          >
            Invoices
          </button>
          <button
            className={`px-4 sm:px-6 py-1.5 sm:py-2 text-mobile-base sm:text-lg font-medium transition-colors rounded-full ${activeTab === "members" ? "bg-[#333] text-white" : "text-white/60 hover:text-white/80"}`}
            onClick={() => setActiveTab("members")}
          >
            Members
          </button>
          <button
            className={`px-4 sm:px-6 py-1.5 sm:py-2 text-mobile-base sm:text-lg font-medium transition-colors rounded-full ${activeTab === "activity" ? "bg-[#333] text-white" : "text-white/60 hover:text-white/80"}`}
            onClick={() => setActiveTab("activity")}
          >
            Activity
          </button>
          <div className="ml-auto flex items-center">
            <button
              onClick={() => setIsAddMemberModalOpen(true)}
              className="flex items-center gap-1 sm:gap-2 rounded-full text-white hover:bg-white/5 h-8 sm:h-10 px-3 sm:px-4 text-mobile-sm sm:text-base transition-colors"
            >
              <Image alt="Add Member" src="/plus-sign-circle.svg" width={14} height={14} className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Add Member</span>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === "invoices" && (
            <div className="space-y-3 sm:space-y-4">
              {isInvoicesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-white/50" />
                </div>
              ) : invoices.length > 0 ? (
                invoices.map((inv) => (
                  <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl bg-white/[0.02]">
                    <div className="flex gap-3 flex-1 min-w-0">
                      {inv.imageUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedImage({
                              url: inv.imageUrl!,
                              description: inv.description || `Invoice — ${formatCurrencyLocal(inv.amount, inv.currency)}`,
                            })
                          }
                          className="relative h-20 w-28 flex-shrink-0 rounded-lg overflow-hidden bg-white/5 cursor-pointer hover:ring-2 hover:ring-white/30 transition-shadow"
                        >
                          <Image src={inv.imageUrl} alt="Invoice" fill className="object-cover" sizes="112px" />
                        </button>
                      )}
                      <div className="min-w-0">
                        <p className="text-white font-medium">
                          {inv.issuer?.name || inv.issuer?.email || "Member"} — {formatCurrencyLocal(inv.amount, inv.currency)}
                        </p>
                        <p className="text-white/60 text-sm">
                          Due {new Date(inv.dueDate).toLocaleDateString()} · {inv.status}
                        </p>
                        {inv.description && <p className="text-white/50 text-sm mt-1">{inv.description}</p>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {isAdmin && (inv.status === "DRAFT" || inv.status === "SENT") && (
                        <>
                          <button
                            onClick={() =>
                              approveInvoiceMutation.mutate(inv.id, {
                                onSuccess: () => toast.success("Invoice approved"),
                                onError: () => toast.error("Failed to approve"),
                              })
                            }
                            disabled={approveInvoiceMutation.isPending}
                            className="rounded-full border border-green-500/50 px-3 py-1.5 text-green-400 hover:bg-green-500/10 text-sm"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setDeclineInvoiceId(inv.id)}
                            disabled={declineInvoiceMutation.isPending}
                            className="rounded-full border border-red-500/50 px-3 py-1.5 text-red-400 hover:bg-red-500/10 text-sm"
                          >
                            Decline
                          </button>
                        </>
                      )}
                      {isAdmin && (inv.status === "APPROVED" || inv.status === "DECLINED" || inv.status === "PAID") && (
                        <button
                          onClick={() =>
                            clearInvoiceMutation.mutate(inv.id, {
                              onSuccess: () => toast.success("Invoice cleared"),
                              onError: () => toast.error("Failed to clear"),
                            })
                          }
                          disabled={clearInvoiceMutation.isPending}
                          className="rounded-full border border-white/20 px-3 py-1.5 text-white/80 hover:text-white text-sm"
                        >
                          Clear
                        </button>
                      )}
                      {inv.issuerId === user.id && (inv.status === "DRAFT" || inv.status === "SENT") && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setInvoiceToEdit({
                                id: inv.id,
                                amount: inv.amount,
                                currency: inv.currency,
                                dueDate: inv.dueDate,
                                description: inv.description ?? null,
                                imageUrl: inv.imageUrl ?? null,
                              })
                            }
                            className="rounded-full border border-white/20 px-3 py-1.5 text-white/80 hover:text-white text-sm"
                          >
                            Edit
                          </button>
                          {inv.status === "DRAFT" && (
                            <button
                              onClick={() =>
                                deleteInvoiceMutation.mutate(inv.id, {
                                  onSuccess: () => toast.success("Invoice deleted"),
                                  onError: () => toast.error("Failed to delete"),
                                })
                              }
                              disabled={deleteInvoiceMutation.isPending}
                              className="rounded-full border border-red-500/50 px-3 py-1.5 text-red-400 hover:bg-red-500/10 text-sm"
                            >
                              Delete
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-white/60">
                  No invoices yet.
                  {!isAdmin && (
                    <>
                      {" "}
                      <button onClick={() => setIsAddInvoiceModalOpen(true)} className="text-white hover:underline">
                        Raise an invoice
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "members" && (
            <div className="space-y-3 sm:space-y-4">
              {(group.groupUsers || []).map((gu: { user: { id: string; name: string | null; image: string | null; email: string | null } }) => {
                const isCurrentUser = gu.user.id === user.id;
                return (
                  <div key={gu.user.id} className="flex items-center justify-between p-3 sm:p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 overflow-hidden rounded-full">
                        <Image
                          src={gu.user.image || `https://api.dicebear.com/9.x/identicon/svg?seed=${gu.user.id}`}
                          alt={gu.user.name || "User"}
                          width={40}
                          height={40}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-mobile-base sm:text-base text-white font-medium">{isCurrentUser ? "You" : gu.user.name}</p>
                        <p className="text-mobile-sm sm:text-base text-white/70">{gu.user.email}</p>
                      </div>
                    </div>
                    {!isCurrentUser && group.createdBy?.id === user.id && (
                      <button onClick={() => handleRemoveMember(gu.user.id)} className="rounded-full hover:bg-white/5 p-2">
                        <Trash2 className="h-4 w-4 text-white/70" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "activity" && (
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-mobile-lg sm:text-xl font-medium text-white mb-3 sm:mb-4">Activity</h3>
              {isActivityLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-white/50" />
                </div>
              ) : activities.length > 0 ? (
                activities.map((act) => (
                  <div key={act.id} className="p-3 sm:p-4 rounded-xl bg-white/[0.02] flex items-center gap-3">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full overflow-hidden flex-shrink-0">
                      <Image
                        src={act.user?.image || `https://api.dicebear.com/9.x/identicon/svg?seed=${act.user?.id}`}
                        alt={act.user?.name || "User"}
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-mobile-base sm:text-base text-white">
                        <span className="font-medium">{act.user?.name || act.user?.email || "Someone"}</span> {activityLabel(act.type)}
                        {act.invoice && (
                          <span className="text-white/70">
                            {" "}
                            ({formatCurrencyLocal(act.invoice.amount, act.invoice.currency)}
                            {act.invoice.recipient?.name && ` to ${act.invoice.recipient.name}`})
                          </span>
                        )}
                      </p>
                      <p className="text-mobile-xs sm:text-sm text-white/60">{new Date(act.createdAt).toLocaleString()}</p>
                      {act.note && <p className="text-white/50 text-sm mt-1">Note: {act.note}</p>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 sm:py-12 text-mobile-base sm:text-base text-white/60">No activity yet</div>
              )}
            </div>
          )}
        </div>
      </div>

      <AddInvoiceModal
        isOpen={isAddInvoiceModalOpen}
        onClose={() => setIsAddInvoiceModalOpen(false)}
        organizationId={organizationId}
      />
      <AddMemberModal isOpen={isAddMemberModalOpen} onClose={() => setIsAddMemberModalOpen(false)} groupId={organizationId} />

      {declineInvoiceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70" onClick={() => { setDeclineInvoiceId(null); setDeclineNote(""); }} />
          <div className="relative z-10 bg-[#101012] rounded-2xl border border-white/20 p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-medium text-white mb-2">Decline invoice</h3>
            <p className="text-white/60 text-sm mb-4">Optionally add a reason (visible in activity).</p>
            <input
              type="text"
              value={declineNote}
              onChange={(e) => setDeclineNote(e.target.value)}
              placeholder="Reason (optional)"
              className="w-full px-4 py-2 rounded-lg bg-white/5 text-white border border-white/20 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setDeclineInvoiceId(null); setDeclineNote(""); }}
                className="flex-1 py-2 rounded-full border border-white/20 text-white"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  declineInvoiceMutation.mutate(
                    { invoiceId: declineInvoiceId, note: declineNote || undefined },
                    {
                      onSuccess: () => {
                        toast.success("Invoice declined");
                        setDeclineInvoiceId(null);
                        setDeclineNote("");
                      },
                      onError: () => toast.error("Failed to decline"),
                    }
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
                <input
                  type="text"
                  value={groupSettings.name || group.name}
                  onChange={(e) => setGroupSettings((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-[#1A1A1C] text-white border border-white/20"
                />
              </div>
              <div>
                <label className="block text-base text-white/80 mb-2">Default Currency</label>
                <input
                  type="text"
                  value={groupSettings.currency || group.defaultCurrency || "USD"}
                  onChange={(e) => setGroupSettings((p) => ({ ...p, currency: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-[#1A1A1C] text-white border border-white/20"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsSettingsModalOpen(false)} className="px-4 py-2 rounded-lg text-white/80 hover:text-white">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-white text-black hover:bg-white/90">
                  Save
                </button>
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

      <ReceiptImageModal
        isOpen={!!expandedImage}
        onClose={() => setExpandedImage(null)}
        imageUrl={expandedImage?.url ?? ""}
        description={expandedImage?.description ?? "Invoice"}
      />

      <EditInvoiceModal
        isOpen={!!invoiceToEdit}
        onClose={() => setInvoiceToEdit(null)}
        invoice={invoiceToEdit}
        onSuccess={() => setInvoiceToEdit(null)}
      />
    </div>
  );
}
