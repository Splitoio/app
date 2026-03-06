"use client";

import { motion } from "framer-motion";
import { fadeIn } from "@/utils/animations";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuthStore } from "@/stores/authStore";
import { useState } from "react";
import { useGetAllOrganizations } from "@/features/business/hooks/use-organizations";
import { CreateOrganizationForm } from "@/components/create-organization-form";
import { useDeleteGroup } from "@/features/groups/hooks/use-create-group";
import { Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, Btn, T, A, Icons } from "@/lib/splito-design";

function isOrgAdmin(
  org: { userId: string; groupUsers?: { userId: string; role?: string | null }[] },
  currentUserId: string | undefined
): boolean {
  if (!currentUserId) return false;
  if (org.userId === currentUserId) return true;
  const membership = org.groupUsers?.find((gu) => gu.userId === currentUserId);
  return membership?.role === "ADMIN";
}

export default function OrganizationOrganizationsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { data: organizations = [], isLoading } = useGetAllOrganizations();
  const deleteGroupMutation = useDeleteGroup();

  return (
    <motion.div variants={fadeIn} initial="initial" animate="animate" className="w-full flex flex-col min-w-0">
      <div className="border-b border-white/[0.07] flex items-center justify-between h-[70px] sticky top-0 bg-[#0b0b0b]/95 backdrop-blur-xl z-10" style={{ padding: "0 28px" }}>
        <h1 className="text-[20px] font-extrabold tracking-[-0.02em] text-white">My Organizations</h1>
        <button onClick={() => setIsCreateModalOpen(true)} style={{ display: "flex", alignItems: "center", gap: 6, height: 40, padding: "0 18px", borderRadius: 12, background: A, color: "#0a0a0a", border: "none", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
          {Icons.plus({ size: 16 })}
          <span>Add Organization</span>
        </button>
      </div>

      <div className="flex-1 p-7 overflow-y-auto" style={{ padding: "28px" }}>
        <Card className="p-[22px]">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: T.muted }} />
            </div>
          ) : organizations.length > 0 ? (
            organizations.map((org, idx) => (
              <div
                key={org.id}
                className="flex items-center justify-between gap-2 py-4"
                style={{ borderBottom: idx < organizations.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
              >
                <Link href={`/organization/${org.id}/invoices`} className="flex flex-1 min-w-0 items-center gap-3 sm:gap-4">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 overflow-hidden rounded-xl shrink-0 border border-white/[0.08] bg-white/[0.03]">
                    {org.image ? <Image src={org.image} alt={org.name} width={48} height={48} className="h-full w-full object-cover" /> : <Image src={`https://api.dicebear.com/9.x/identicon/svg?seed=${org.id}`} alt={org.name} width={48} height={48} className="h-full w-full" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold truncate" style={{ color: T.bright }}>{org.name}</p>
                    <p className="text-[13px] font-medium" style={{ color: T.muted }}>{(org.groupUsers || []).length} member{(org.groupUsers || []).length !== 1 ? "s" : ""}</p>
                  </div>
                </Link>
                {isOrgAdmin(org, user?.id) && (
                  <button type="button" onClick={(e) => { e.preventDefault(); setOrgToDelete({ id: org.id, name: org.name }); }} className="shrink-0 p-2 rounded-lg" style={{ color: T.muted }} aria-label={`Delete organization ${org.name}`}>
                    <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                )}
              </div>
            ))
          ) : (
            <p className="text-center py-12 text-sm" style={{ color: T.body }}>No organizations yet. Create one to get started!</p>
          )}
        </Card>
      </div>

      <CreateOrganizationForm isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />

      {orgToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => !isDeleting && setOrgToDelete(null)}>
          <div className="rounded-2xl p-6 max-w-sm w-full shadow-xl" style={{ background: "linear-gradient(145deg, #111 0%, #0d0d0d 100%)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)" }} onClick={(e) => e.stopPropagation()}>
            <p className="mb-4 text-sm" style={{ color: T.body }}>Are you sure you want to delete &quot;{orgToDelete.name}&quot;? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <Btn variant="ghost" onClick={() => !isDeleting && setOrgToDelete(null)}>Cancel</Btn>
              <Btn variant="danger" onClick={() => { setIsDeleting(true); deleteGroupMutation.mutate(orgToDelete.id, { onSuccess: () => { toast.success("Organization deleted"); setOrgToDelete(null); setIsDeleting(false); }, onError: (err: { message?: string }) => { toast.error(err?.message || "Failed to delete organization"); setIsDeleting(false); } }); }} style={{ opacity: isDeleting ? 0.7 : 1 }}>
                {isDeleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting...</> : "Delete"}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
